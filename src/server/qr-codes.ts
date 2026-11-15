import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, isNull, lt, lte, ne, not, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { qrCodeLabels, qrCodes, qrDestinationChanges, qrFolders } from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { HttpError } from "@/server/http";
import type { QRCodeRecord } from "@/lib/qr-types";
import { qrDesignSchema, hasVisibleContrast } from "@/lib/qr-design";
import { qrFilterDate, qrPageSize, type QRFilterRule, type QRListQuery } from "@/lib/qr-list";
import { safeDestination } from "@/lib/qr-destination";
import { describeQRDestination, isStaticQRType, parseQRContent } from "@/lib/qr-content";

export { safeDestination };
const createInput = z
  .object({
    destination_url: z.string().trim().max(2048).refine(safeDestination).optional(),
    content: z.unknown().optional(),
    title: z
      .string()
      .trim()
      .refine(
        (value) => Array.from(value).length <= 255 && !value.includes("\0"),
      )
      .optional(),
    qr_type: z.string().trim().min(1).max(50).default("website"),
    design: qrDesignSchema.refine(hasVisibleContrast).optional(),
    tracking_enabled: z.boolean().optional(),
  })
  .strict();
const updateInput = z.union([
  z.object({ design: qrDesignSchema.refine(hasVisibleContrast) }).strict(),
  z.object({ is_active: z.boolean() }).strict(),
  z.object({ destination_url: z.string().trim().max(2048) }).strict(),
]);

export function qrRecord(row: typeof qrCodes.$inferSelect): QRCodeRecord {
  return {
    id: row.id,
    user_id: row.userId,
    short_code: row.shortCode,
    destination_url: row.destinationUrl,
    title: row.title,
    qr_type: row.qrType,
    design: row.design,
    content: row.content,
    tracking_enabled: row.trackingEnabled,
    is_active: row.isActive,
    total_scans: row.totalScans,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    folder_id: row.folderId,
    watched: row.watched,
  };
}

export async function listCodes(userId: string) {
  return (
    await getDb()
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.userId, userId))
      .orderBy(desc(qrCodes.createdAt))
      .limit(1000)
  ).map(qrRecord);
}

export async function getQRCounts(userId: string) {
  const [counts] = await getDb().select({
    total: count(),
    active: sql<number>`count(*) filter (where ${qrCodes.trackingEnabled} and ${qrCodes.isActive})`.mapWith(Number),
    inactive: sql<number>`count(*) filter (where ${qrCodes.trackingEnabled} and not ${qrCodes.isActive})`.mapWith(Number),
    scans: sql<number>`coalesce(sum(${qrCodes.totalScans}) filter (where ${qrCodes.trackingEnabled}), 0)`.mapWith(Number),
  }).from(qrCodes).where(eq(qrCodes.userId, userId));
  return counts;
}

const displayName = sql<string>`coalesce(${qrCodes.title}, ${qrCodes.destinationUrl})`;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

function filterCondition({ field, op, value }: QRFilterRule) {
  if (field === 'mode') return eq(qrCodes.trackingEnabled, (value === 'tracked') !== (op === 'is_not'));
  if (field === 'status') return and(eq(qrCodes.trackingEnabled, true),
    op === 'is_not' ? ne(qrCodes.isActive, value === 'active') : eq(qrCodes.isActive, value === 'active'));
  if (field === 'scans') {
    const number = Number(value);
    return op === 'gte' ? gte(qrCodes.totalScans, number) : op === 'lte' ? lte(qrCodes.totalScans, number) : eq(qrCodes.totalScans, number);
  }
  if (field === 'created' || field === 'updated') {
    const start = qrFilterDate(value);
    if (!start) return undefined;
    const end = new Date(start.valueOf() + 86400000);
    const column = field === 'created' ? qrCodes.createdAt : qrCodes.updatedAt;
    return op === 'before' ? lt(column, start) : op === 'after' ? gte(column, end)
      : and(gte(column, start), lt(column, end));
  }
  const text = field === 'name' ? displayName : qrCodes.destinationUrl;
  const phrase = escapeLike(value);
  const condition = ilike(text, op === 'contains' || op === 'not_contains' ? `%${phrase}%` : phrase);
  return op === 'is_not' || op === 'not_contains' ? not(condition) : condition;
}

export async function listCodePage(userId: string, query: QRListQuery) {
  const db = getDb();
  const phrase = `%${escapeLike(query.q)}%`;
  const labelMatch = query.label ? exists(db.select({ one: sql`1` }).from(qrCodeLabels).where(and(
    eq(qrCodeLabels.userId, userId), eq(qrCodeLabels.qrCodeId, qrCodes.id), eq(qrCodeLabels.labelId, query.label),
  ))) : undefined;
  const matches = and(
    eq(qrCodes.userId, userId),
    query.focus ? eq(qrCodes.id, query.focus) : undefined,
    query.q ? or(ilike(qrCodes.title, phrase), ilike(qrCodes.destinationUrl, phrase)) : undefined,
    query.mode || query.status ? eq(qrCodes.trackingEnabled, query.mode !== 'direct') : undefined,
    query.status ? eq(qrCodes.isActive, query.status === 'active') : undefined,
    query.folder === 'none' ? isNull(qrCodes.folderId) : query.folder ? exists(
      db.select({ one: sql`1` }).from(qrFolders).where(and(
        eq(qrFolders.id, qrCodes.folderId), eq(qrFolders.id, query.folder), eq(qrFolders.userId, userId),
      )),
    ) : undefined,
    labelMatch,
    query.watch ? and(eq(qrCodes.trackingEnabled, true), eq(qrCodes.watched, query.watch === 'yes')) : undefined,
    ...query.rules.map(filterCondition),
  );
  const ordering = {
    newest: desc(qrCodes.createdAt),
    oldest: asc(qrCodes.createdAt),
    updated: desc(qrCodes.updatedAt),
    name: asc(sql`lower(${displayName})`),
    scans: desc(qrCodes.totalScans),
  };
  return db.transaction(async (tx) => {
    const [{ total }] = await tx.select({ total: count() }).from(qrCodes).where(matches);
    const pages = Math.max(1, Math.ceil(total / qrPageSize));
    const page = Math.min(query.page, pages);
    const rows = await tx.select().from(qrCodes).where(matches)
      .orderBy(ordering[query.sort], desc(qrCodes.id))
      .limit(qrPageSize).offset((page - 1) * qrPageSize);
    const assignments = rows.length ? await tx.select({ qrCodeId: qrCodeLabels.qrCodeId, labelId: qrCodeLabels.labelId })
      .from(qrCodeLabels).where(and(eq(qrCodeLabels.userId, userId), inArray(qrCodeLabels.qrCodeId, rows.map(row => row.id)))) : [];
    const labelsByCode = new Map<string, string[]>();
    for (const { qrCodeId, labelId } of assignments) {
      const list = labelsByCode.get(qrCodeId);
      if (list) list.push(labelId);
      else labelsByCode.set(qrCodeId, [labelId]);
    }
    return { qrCodes: rows.map(row => ({ ...qrRecord(row), label_ids: labelsByCode.get(row.id) ?? [] })), total, page, pages };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}
export async function createCode(userId: string, input: unknown, options?: { recordId?: string }) {
  const parsed = createInput.safeParse(input);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Provide a valid HTTP/HTTPS destination and QR details",
    );
  const values = resolveCreateValues(parsed.data);
  for (let attempt = 0; attempt < 3; attempt++) {
    const shortCode = randomBytes(9).toString("base64url");
    const [row] = await getDb()
      .insert(qrCodes)
      .values({
        id: options?.recordId,
        userId,
        shortCode,
        ...values,
        design: parsed.data.design,
      })
      .onConflictDoNothing()
      .returning();
    if (row) return codeResponse(row);
    if (options?.recordId) {
      const [existing] = await getDb().select().from(qrCodes)
        .where(and(eq(qrCodes.userId, userId), eq(qrCodes.id, options.recordId)));
      if (existing) return codeResponse(existing);
    }
  }
  throw new HttpError(503, "Unable to allocate a QR code. Please retry");
}

function resolveCreateValues(data: z.infer<typeof createInput>) {
  const titleFrom = (value: string) => data.title || Array.from(value).slice(0, 255).join("");
  if (data.content !== undefined) {
    const parsed = parseQRContent(data.content);
    if (!parsed || data.destination_url !== undefined)
      throw new HttpError(400, "Provide valid content for this QR type");
    if (data.tracking_enabled)
      throw new HttpError(400, "Static QR types encode their content and cannot be tracked");
    return {
      destinationUrl: parsed.payload,
      content: parsed.content,
      qrType: parsed.content.type,
      trackingEnabled: false,
      title: titleFrom(describeQRDestination({ qr_type: parsed.content.type, destination_url: parsed.payload, content: parsed.content })),
    };
  }
  if (!data.destination_url || isStaticQRType(data.qr_type))
    throw new HttpError(400, "Provide a valid HTTP/HTTPS destination and QR details");
  return {
    destinationUrl: new URL(data.destination_url).href,
    content: null,
    qrType: data.qr_type,
    trackingEnabled: data.tracking_enabled ?? true,
    title: titleFrom(data.destination_url),
  };
}

function codeResponse(row: typeof qrCodes.$inferSelect) {
  return {
    qrCode: qrRecord(row),
    trackingUrl: row.trackingEnabled
      ? `${getServerEnv().appUrl}/qr?code=${encodeURIComponent(row.shortCode)}`
      : null,
  };
}
export async function getCode(userId: string, id: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new HttpError(404, "QR code not found");
  const [row] = await getDb()
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)));
  if (!row) throw new HttpError(404, "QR code not found");
  return codeResponse(row);
}
export async function updateCode(
  userId: string,
  id: string,
  input: unknown,
) {
  if (!z.string().uuid().safeParse(id).success)
    throw new HttpError(404, "QR code not found");
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, "Provide a valid QR design or tracking state");
  if ("destination_url" in parsed.data) return changeDestination(userId, id, parsed.data.destination_url);
  const values = "design" in parsed.data
    ? { design: parsed.data.design }
    : { isActive: parsed.data.is_active };
  const [row] = await getDb()
    .update(qrCodes)
    .set({ ...values, updatedAt: new Date() })
    .where(and(
      eq(qrCodes.id, id),
      eq(qrCodes.userId, userId),
      "isActive" in values ? eq(qrCodes.trackingEnabled, true) : undefined,
    ))
    .returning();
  if (!row) throw new HttpError(404, "QR code not found");
  return codeResponse(row);
}
async function changeDestination(userId: string, id: string, value: string) {
  if (!safeDestination(value)) throw new HttpError(400, "Provide a valid HTTP/HTTPS destination");
  const destination = new URL(value).href;
  if (destination.length > 2048) throw new HttpError(400, "Provide a valid HTTP/HTTPS destination");
  const row = await getDb().transaction(async (tx) => {
    const [current] = await tx.select().from(qrCodes)
      .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId))).for("update");
    if (!current) throw new HttpError(404, "QR code not found");
    if (!current.trackingEnabled)
      throw new HttpError(409, "Only trackable QR codes can change destination without a new code");
    if (current.destinationUrl === destination)
      throw new HttpError(409, "This QR code already uses that destination");
    await tx.insert(qrDestinationChanges).values({
      userId, qrCodeId: id, previousUrl: current.destinationUrl, newUrl: destination,
    });
    const [updated] = await tx.update(qrCodes)
      .set({ destinationUrl: destination, updatedAt: new Date() })
      .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)))
      .returning();
    return updated;
  });
  return codeResponse(row);
}

export async function listDestinationChanges(userId: string, id: string) {
  await getCode(userId, id);
  const rows = await getDb().select().from(qrDestinationChanges)
    .where(and(eq(qrDestinationChanges.userId, userId), eq(qrDestinationChanges.qrCodeId, id)))
    .orderBy(desc(qrDestinationChanges.changedAt), desc(qrDestinationChanges.id))
    .limit(50);
  return {
    changes: rows.map((row) => ({
      id: row.id,
      previous_url: row.previousUrl,
      new_url: row.newUrl,
      changed_at: row.changedAt.toISOString(),
    })),
  };
}

export async function deleteCode(userId: string, id: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new HttpError(404, "QR code not found");
  const [deleted] = await getDb()
    .delete(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)))
    .returning({ id: qrCodes.id });
  if (!deleted) throw new HttpError(404, "QR code not found");
  return { deleted: true };
}
