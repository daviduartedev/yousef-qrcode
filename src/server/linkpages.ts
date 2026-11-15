import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { assets, linkPageEvents, linkPages, qrCodes } from '@/server/db/schema';
import { claimSlug, slugFree } from '@/server/public-slugs';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import { createCode } from '@/server/qr-codes';
import { visitorFrom } from '@/server/visitor';
import { duplicateWindowSeconds } from '@/lib/qr-analytics';
import {
  blockTarget, linkpageContentSchema, linkpageLimits, linkpageTemplates, slugify, validSlug,
  type LinkpageContent, type LinkpageRecord, type LinkpageSummary,
} from '@/lib/linkpages';

const id = z.uuid();
type Row = typeof linkPages.$inferSelect;

const activity = (kind: 'view' | 'click') => sql<number>`(select count(*)::int from qrconnect.link_page_events e
  where e.page_id = "link_pages"."id" and e.kind = ${kind} and e.occurred_at >= now() - interval '30 days')`;

function summary(row: Row & { views_30d?: number; clicks_30d?: number }): LinkpageSummary {
  return {
    id: row.id, title: row.title, slug: row.slug, template: row.template, is_published: row.isPublished,
    published_at: row.publishedAt?.toISOString() ?? null,
    has_unpublished_changes: !row.published || JSON.stringify(row.published) !== JSON.stringify(row.draft),
    updated_at: row.updatedAt.toISOString(), views_30d: row.views_30d ?? 0, clicks_30d: row.clicks_30d ?? 0, qr_code_id: row.qrCodeId,
  };
}
const record = (row: Row): LinkpageRecord => ({ ...summary(row), draft: row.draft as LinkpageContent, published: (row.published as LinkpageContent | null) ?? null });

export async function listLinkpages(userId: string) {
  const rows = await getDb().select({ page: linkPages, views: activity('view'), clicks: activity('click') }).from(linkPages)
    .where(eq(linkPages.userId, userId)).orderBy(desc(linkPages.updatedAt), desc(linkPages.id));
  return rows.map(({ page, views, clicks }) => summary({ ...page, views_30d: views, clicks_30d: clicks }));
}

async function ownedRow(userId: string, pageId: string) {
  if (!id.safeParse(pageId).success) throw new HttpError(404, 'Linkpage not found');
  const [row] = await getDb().select().from(linkPages).where(and(eq(linkPages.userId, userId), eq(linkPages.id, pageId)));
  if (!row) throw new HttpError(404, 'Linkpage not found');
  return row;
}
export async function getLinkpage(userId: string, pageId: string) { return record(await ownedRow(userId, pageId)); }

const createInput = z.object({ template: z.string(), creation_key: z.uuid(), title: z.string().trim().min(1).max(80).optional() }).strict();

/** Creating twice with the same key returns the first page, so a double click never makes two drafts. */
export async function createLinkpage(userId: string, input: unknown) {
  const parsed = createInput.safeParse(input);
  const template = parsed.success ? linkpageTemplates.find(item => item.id === parsed.data.template) : undefined;
  if (!parsed.success || !template) throw new HttpError(400, 'Choose a valid template');
  const title = parsed.data.title ?? template.name;
  const base = slugify(title) || 'page';
  return getDb().transaction(async tx => {
    // One creation at a time per account keeps the page limit and the idempotency key exact.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'linkpages:' + userId}))`);
    const [existing] = await tx.select().from(linkPages).where(and(eq(linkPages.userId, userId), eq(linkPages.creationKey, parsed.data.creation_key)));
    if (existing) return { page: record(existing), created: false };
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(linkPages).where(eq(linkPages.userId, userId));
    if (total >= linkpageLimits.maxPages) throw new HttpError(409, 'You reached the Linkpage limit. Delete a page to create another.');
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${base.slice(0, 30)}-${randomBytes(3).toString('hex')}`.replace(/^-+/, '');
      if (!(await slugFree(tx, 'linkpage', slug, userId))) continue;
      await claimSlug(tx, 'linkpage', slug, userId);
      const [row] = await tx.insert(linkPages).values({
        userId, slug, title, template: template.id, creationKey: parsed.data.creation_key, draft: template.content(),
      }).returning();
      return { page: record(row), created: true };
    }
    throw new HttpError(503, 'Could not create the Linkpage. Try again.');
  });
}

/** Avatar and cover must be images from the same account. */
async function assertMedia(userId: string, content: LinkpageContent) {
  for (const assetId of [content.profile.avatarAssetId, content.profile.coverAssetId]) {
    if (!assetId) continue;
    const [row] = await getDb().select({ id: assets.id }).from(assets)
      .where(and(eq(assets.userId, userId), eq(assets.id, assetId), eq(assets.kind, 'image')));
    if (!row) throw new HttpError(400, 'Choose images from your library');
  }
}

const updateInput = z.object({
  draft: z.unknown().optional(),
  title: z.string().trim().min(1).max(80).optional(),
  slug: z.string().trim().toLowerCase().optional(),
}).strict();

export async function updateLinkpage(userId: string, pageId: string, input: unknown) {
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid Linkpage changes');
  const row = await ownedRow(userId, pageId);
  const changes: Partial<typeof linkPages.$inferInsert> = {};
  if (parsed.data.draft !== undefined) {
    const draft = linkpageContentSchema.safeParse(parsed.data.draft);
    if (!draft.success) throw new HttpError(400, 'Some blocks are incomplete or invalid');
    await assertMedia(userId, draft.data);
    changes.draft = draft.data;
  }
  if (parsed.data.title !== undefined) changes.title = parsed.data.title;
  const renaming = parsed.data.slug !== undefined && parsed.data.slug !== row.slug;
  if (renaming) {
    // Once published or linked to a QR code, the address must keep working.
    if (row.published || row.qrCodeId) throw new HttpError(409, 'The address cannot change after the page was published or got a QR code');
    if (!validSlug(parsed.data.slug!)) throw new HttpError(400, 'Use 3–40 lowercase letters, numbers or hyphens');
    changes.slug = parsed.data.slug;
  }
  return getDb().transaction(async tx => {
    if (renaming) await claimSlug(tx, 'linkpage', changes.slug!, userId);
    // The lock conditions are repeated in the update so a concurrent publish or QR creation wins.
    const [updated] = await tx.update(linkPages).set({ ...changes, updatedAt: new Date() })
      .where(and(eq(linkPages.userId, userId), eq(linkPages.id, pageId),
        renaming ? and(isNull(linkPages.published), isNull(linkPages.qrCodeId)) : undefined)).returning();
    if (!updated) throw new HttpError(409, 'The address cannot change after the page was published or got a QR code');
    return record(updated);
  }).catch(error => {
    if ((error as { cause?: { code?: string } }).cause?.code === '23505') throw new HttpError(409, 'This address is already taken');
    throw error;
  });
}

export async function publishLinkpage(userId: string, pageId: string, publish: boolean) {
  const row = await ownedRow(userId, pageId);
  if (publish) {
    const draft = linkpageContentSchema.safeParse(row.draft);
    if (!draft.success) throw new HttpError(400, 'Some blocks are incomplete or invalid');
    await assertMedia(userId, draft.data);
    if (!draft.data.profile.name.trim() && draft.data.blocks.length === 0) throw new HttpError(400, 'Add a name or at least one block before publishing');
  }
  const [updated] = await getDb().update(linkPages).set(publish
    ? { published: row.draft, isPublished: true, publishedAt: new Date(), updatedAt: new Date() }
    : { isPublished: false, updatedAt: new Date() })
    .where(and(eq(linkPages.userId, userId), eq(linkPages.id, pageId))).returning();
  return record(updated);
}

export async function deleteLinkpage(userId: string, pageId: string) {
  if (!id.safeParse(pageId).success) throw new HttpError(404, 'Linkpage not found');
  return getDb().transaction(async tx => {
    const [row] = await tx.delete(linkPages).where(and(eq(linkPages.userId, userId), eq(linkPages.id, pageId)))
      .returning({ id: linkPages.id, qrCodeId: linkPages.qrCodeId });
    if (!row) throw new HttpError(404, 'Linkpage not found');
    // The page's QR code stops redirecting; its address stays reserved for this account.
    if (row.qrCodeId) await tx.update(qrCodes).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(qrCodes.userId, userId), eq(qrCodes.id, row.qrCodeId)));
    return { deleted: true, qr_code_deactivated: Boolean(row.qrCodeId) };
  });
}

export const publicLinkpageUrl = (slug: string) => `${getServerEnv().appUrl}/p/${slug}`;

/** One tracked QR per page, pointing at the stable public address. */
export async function linkpageQr(userId: string, pageId: string) {
  if (!id.safeParse(pageId).success) throw new HttpError(404, 'Linkpage not found');
  // The row lock makes concurrent requests wait, so a page never gets two QR codes.
  return getDb().transaction(async tx => {
    const [row] = await tx.select().from(linkPages).where(and(eq(linkPages.userId, userId), eq(linkPages.id, pageId))).for('update');
    if (!row) throw new HttpError(404, 'Linkpage not found');
    if (row.qrCodeId) return { qr_code_id: row.qrCodeId, created: false };
    const qr = await createCode(userId, { title: row.title, destination_url: publicLinkpageUrl(row.slug), tracking_enabled: true });
    await tx.update(linkPages).set({ qrCodeId: qr.qrCode.id }).where(eq(linkPages.id, pageId));
    return { qr_code_id: qr.qrCode.id, created: true };
  });
}

const slugParam = z.string().regex(/^[a-z0-9-]{3,40}$/);

export async function publicLinkpage(slug: string) {
  if (!slugParam.safeParse(slug).success) return null;
  const [row] = await getDb().select({ id: linkPages.id, slug: linkPages.slug, published: linkPages.published })
    .from(linkPages).where(and(eq(linkPages.slug, slug), eq(linkPages.isPublished, true)));
  const content = row ? linkpageContentSchema.safeParse(row.published) : null;
  return row && content?.success ? { id: row.id, slug: row.slug, content: content.data } : null;
}

/** Counts a public view or click; bots, cross-site embeds and repeats from the same trusted address within 10 s are skipped. */
async function recordEvent(request: Request, pageId: string, kind: 'view' | 'click', blockId: string | null) {
  const visitor = visitorFrom(request);
  if (visitor.bot || request.headers.get('sec-fetch-site') === 'cross-site' && kind === 'view'
    || ['image', 'script', 'style', 'iframe'].includes(request.headers.get('sec-fetch-dest') ?? '')) return;
  await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'linkpage:' + pageId}))`);
    // Separate per-minute caps, so a flood of one kind cannot hide the other.
    const [{ recent }] = await tx.select({ recent: sql<number>`count(*)::int` }).from(linkPageEvents)
      .where(and(eq(linkPageEvents.pageId, pageId), eq(linkPageEvents.kind, kind), sql`${linkPageEvents.occurredAt} >= now() - interval '60 seconds'`));
    if (recent >= 300) return;
    if (visitor.ipAddress) {
      const [{ repeats }] = await tx.select({ repeats: sql<number>`count(*)::int` }).from(linkPageEvents).where(and(
        eq(linkPageEvents.pageId, pageId), eq(linkPageEvents.kind, kind), sql`${linkPageEvents.blockId} is not distinct from ${blockId}`,
        eq(linkPageEvents.ipAddress, visitor.ipAddress), eq(linkPageEvents.userAgent, visitor.userAgent),
        sql`${linkPageEvents.occurredAt} >= now() - make_interval(secs => ${duplicateWindowSeconds})`));
      if (repeats > 0) return;
    }
    await tx.insert(linkPageEvents).values({
      pageId, kind, blockId, deviceType: visitor.deviceType, os: visitor.os, browser: visitor.browser,
      country: visitor.country, ipAddress: visitor.ipAddress, userAgent: visitor.userAgent,
    });
  });
}

export async function recordLinkpageView(request: Request, slug: string) {
  const page = await publicLinkpage(slug);
  if (!page) return false;
  await recordEvent(request, page.id, 'view', null);
  return true;
}

/** Resolves a block click to its published target and counts it. */
export async function linkpageClick(request: Request, slug: string, blockId: string) {
  const page = await publicLinkpage(slug);
  const block = page?.content.blocks.find(item => item.id === blockId);
  const target = block ? blockTarget(block) : null;
  if (!page || !block || !target) return null;
  await recordEvent(request, page.id, 'click', block.id);
  return target;
}

/** Public media: only the avatar or cover referenced by the published version of this page. */
export async function linkpageMedia(slug: string, assetId: string) {
  const page = await publicLinkpage(slug);
  if (!page || !id.safeParse(assetId).success) return null;
  if (![page.content.profile.avatarAssetId, page.content.profile.coverAssetId].includes(assetId)) return null;
  const [row] = await getDb().select({ mimeType: assets.mimeType, content: assets.content, sha256: assets.sha256, kind: assets.kind })
    .from(assets).innerJoin(linkPages, eq(linkPages.userId, assets.userId))
    .where(and(eq(linkPages.id, page.id), eq(assets.id, assetId), eq(assets.kind, 'image')));
  return row ?? null;
}
