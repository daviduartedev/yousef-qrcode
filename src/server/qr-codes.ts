import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { qrCodes } from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { HttpError } from "@/server/http";
import type { QRCodeRecord } from "@/lib/qr-types";
import { qrDesignSchema, hasVisibleContrast } from "@/lib/qr-design";

export function safeDestination(value: string) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
const createInput = z
  .object({
    destination_url: z.string().trim().max(2048).refine(safeDestination),
    title: z
      .string()
      .trim()
      .refine(
        (value) => Array.from(value).length <= 255 && !value.includes("\0"),
      )
      .optional(),
    qr_type: z.string().trim().min(1).max(50).default("website"),
    design: qrDesignSchema.refine(hasVisibleContrast).optional(),
    tracking_enabled: z.boolean().default(true),
  })
  .strict();
const updateInput = z
  .object({ design: qrDesignSchema.refine(hasVisibleContrast) })
  .strict();

export function qrRecord(row: typeof qrCodes.$inferSelect): QRCodeRecord {
  return {
    id: row.id,
    user_id: row.userId,
    short_code: row.shortCode,
    destination_url: row.destinationUrl,
    title: row.title,
    qr_type: row.qrType,
    design: row.design,
    tracking_enabled: row.trackingEnabled,
    is_active: row.isActive,
    total_scans: row.totalScans,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
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
export async function createCode(userId: string, input: unknown) {
  const parsed = createInput.safeParse(input);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Provide a valid HTTP/HTTPS destination and QR details",
    );
  for (let attempt = 0; attempt < 3; attempt++) {
    const shortCode = randomBytes(9).toString("base64url");
    const [row] = await getDb()
      .insert(qrCodes)
      .values({
        userId,
        shortCode,
        destinationUrl: new URL(parsed.data.destination_url).href,
        title:
          parsed.data.title ||
          Array.from(parsed.data.destination_url).slice(0, 255).join(""),
        qrType: parsed.data.qr_type,
        design: parsed.data.design,
        trackingEnabled: parsed.data.tracking_enabled,
      })
      .onConflictDoNothing({ target: qrCodes.shortCode })
      .returning();
    if (row) return codeResponse(row);
  }
  throw new HttpError(503, "Unable to allocate a QR code. Please retry");
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
export async function updateCodeDesign(
  userId: string,
  id: string,
  input: unknown,
) {
  if (!z.string().uuid().safeParse(id).success)
    throw new HttpError(404, "QR code not found");
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, "Provide a valid QR design");
  const [row] = await getDb()
    .update(qrCodes)
    .set({ design: parsed.data.design, updatedAt: new Date() })
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)))
    .returning();
  if (!row) throw new HttpError(404, "QR code not found");
  return codeResponse(row);
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
