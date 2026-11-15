import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { assets, cardContacts, cardEvents, cards, qrCodes } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import { createCode } from '@/server/qr-codes';
import { visitorFrom } from '@/server/visitor';
import { claimSlug, slugFree } from '@/server/public-slugs';
import { deactivateLinkedCodes } from '@/server/qr-linked-cleanup';
import { csvCell, duplicateWindowSeconds } from '@/lib/qr-analytics';
import { slugify, themePreset, validSlug } from '@/lib/linkpages';
import {
  blankCard, cardActions, cardContentSchema, cardLimits, cardTemplates, cardVCard, contactInputSchema,
  type CardContactRecord, type CardContent, type CardRecord, type CardSummary,
} from '@/lib/cards';

const id = z.uuid();
type Row = typeof cards.$inferSelect;
type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

const count30 = (kind: string) => sql<number>`(select count(*)::int from qrconnect.card_events e
  where e.card_id = "cards"."id" and e.kind = ${kind} and e.occurred_at >= now() - interval '30 days')`;
const contactsTotal = sql<number>`(select count(*)::int from qrconnect.card_contacts c where c.card_id = "cards"."id")`;

function summary(row: Row, extra: { views?: number; saves?: number; contacts?: number } = {}): CardSummary {
  return {
    id: row.id, title: row.title, slug: row.slug, is_published: row.isPublished, published_at: row.publishedAt?.toISOString() ?? null,
    has_unpublished_changes: !row.published || JSON.stringify(row.published) !== JSON.stringify(row.draft),
    updated_at: row.updatedAt.toISOString(), views_30d: extra.views ?? 0, saves_30d: extra.saves ?? 0, contacts_total: extra.contacts ?? 0,
    qr_code_id: row.qrCodeId,
  };
}
const record = (row: Row): CardRecord => ({ ...summary(row), draft: row.draft as CardContent, published: (row.published as CardContent | null) ?? null });

export async function listCards(userId: string) {
  const rows = await getDb().select({ card: cards, views: count30('view'), saves: count30('save'), contacts: contactsTotal })
    .from(cards).where(eq(cards.userId, userId)).orderBy(desc(cards.updatedAt), desc(cards.id));
  return rows.map(({ card, views, saves, contacts }) => summary(card, { views, saves, contacts }));
}

async function ownedRow(userId: string, cardId: string, tx?: Tx) {
  if (!id.safeParse(cardId).success) throw new HttpError(404, 'Card not found');
  const [row] = await (tx ?? getDb()).select().from(cards).where(and(eq(cards.userId, userId), eq(cards.id, cardId)));
  if (!row) throw new HttpError(404, 'Card not found');
  return row;
}
export async function getCard(userId: string, cardId: string) { return record(await ownedRow(userId, cardId)); }

const createInput = z.object({
  template: z.enum(cardTemplates.map(item => item.id) as [string, ...string[]]),
  creation_key: z.uuid(),
  first_name: z.string().trim().max(60).optional(),
}).strict();

/** Same key, same card: double clicks and retries never create two drafts. */
export async function createCard(userId: string, input: unknown) {
  const parsed = createInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Choose a valid template');
  const template = cardTemplates.find(item => item.id === parsed.data.template)!;
  const draft = { ...blankCard(parsed.data.first_name || 'Your name'), theme: themePreset(template.theme) };
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'cards:' + userId}))`);
    const [existing] = await tx.select().from(cards).where(and(eq(cards.userId, userId), eq(cards.creationKey, parsed.data.creation_key)));
    if (existing) return { card: record(existing), created: false };
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(cards).where(eq(cards.userId, userId));
    if (total >= cardLimits.maxCards) throw new HttpError(409, 'You reached the card limit. Delete a card to create another.');
    const base = slugify(parsed.data.first_name || 'card') || 'card';
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${base.slice(0, 30)}-${randomBytes(3).toString('hex')}`;
      if (!(await slugFree(tx, 'card', slug, userId))) continue;
      await claimSlug(tx, 'card', slug, userId);
      const [row] = await tx.insert(cards).values({ userId, slug, title: parsed.data.first_name || template.name, creationKey: parsed.data.creation_key, draft }).returning();
      return { card: record(row), created: true };
    }
    throw new HttpError(503, 'Could not create the card. Try again.');
  });
}

async function assertMedia(userId: string, content: CardContent) {
  for (const assetId of [content.person.photoAssetId, content.person.coverAssetId]) {
    if (!assetId) continue;
    const [row] = await getDb().select({ id: assets.id }).from(assets).where(and(eq(assets.userId, userId), eq(assets.id, assetId), eq(assets.kind, 'image')));
    if (!row) throw new HttpError(400, 'Choose images from your library');
  }
}

const updateInput = z.object({ draft: z.unknown().optional(), title: z.string().trim().min(1).max(80).optional(), slug: z.string().trim().toLowerCase().optional() }).strict();

export async function updateCard(userId: string, cardId: string, input: unknown) {
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid card changes');
  const row = await ownedRow(userId, cardId);
  const changes: Partial<typeof cards.$inferInsert> = {};
  if (parsed.data.draft !== undefined) {
    const draft = cardContentSchema.safeParse(parsed.data.draft);
    if (!draft.success) throw new HttpError(400, 'Some fields are incomplete or invalid');
    await assertMedia(userId, draft.data);
    changes.draft = draft.data;
  }
  if (parsed.data.title !== undefined) changes.title = parsed.data.title;
  const renaming = parsed.data.slug !== undefined && parsed.data.slug !== row.slug;
  if (renaming) {
    if (row.published || row.qrCodeId) throw new HttpError(409, 'The address cannot change after the card was published or got a QR code');
    if (!validSlug(parsed.data.slug!)) throw new HttpError(400, 'Use 3–40 lowercase letters, numbers or hyphens');
    changes.slug = parsed.data.slug;
  }
  return getDb().transaction(async tx => {
    if (renaming) await claimSlug(tx, 'card', changes.slug!, userId);
    const [updated] = await tx.update(cards).set({ ...changes, updatedAt: new Date() })
      .where(and(eq(cards.userId, userId), eq(cards.id, cardId), renaming ? and(isNull(cards.published), isNull(cards.qrCodeId)) : undefined)).returning();
    if (!updated) throw new HttpError(409, 'The address cannot change after the card was published or got a QR code');
    return record(updated);
  }).catch(error => {
    if ((error as { cause?: { code?: string } }).cause?.code === '23505') throw new HttpError(409, 'This address is already taken');
    throw error;
  });
}

export async function publishCard(userId: string, cardId: string, publish: boolean) {
  const row = await ownedRow(userId, cardId);
  if (publish) {
    const draft = cardContentSchema.safeParse(row.draft);
    if (!draft.success) throw new HttpError(400, 'Some fields are incomplete or invalid');
    await assertMedia(userId, draft.data);
  }
  const [updated] = await getDb().update(cards).set(publish
    ? { published: sql`draft`, isPublished: true, publishedAt: new Date(), updatedAt: new Date() }
    : { isPublished: false, updatedAt: new Date() })
    .where(and(eq(cards.userId, userId), eq(cards.id, cardId))).returning();
  return record(updated);
}

/** Deleting a card removes its contacts and events, deactivates its QR code and keeps the address reserved. */
export async function deleteCard(userId: string, cardId: string) {
  if (!id.safeParse(cardId).success) throw new HttpError(404, 'Card not found');
  return getDb().transaction(async tx => {
    const [row] = await tx.delete(cards).where(and(eq(cards.userId, userId), eq(cards.id, cardId))).returning({ id: cards.id, qrCodeId: cards.qrCodeId });
    if (!row) throw new HttpError(404, 'Card not found');
    await deactivateLinkedCodes(tx, userId, 'card', row.id);
    if (row.qrCodeId) await tx.update(qrCodes).set({ isActive: false, updatedAt: new Date() }).where(and(eq(qrCodes.userId, userId), eq(qrCodes.id, row.qrCodeId)));
    return { deleted: true, qr_code_deactivated: Boolean(row.qrCodeId) };
  });
}

export const publicCardUrl = (slug: string) => `${getServerEnv().appUrl}/c/${slug}`;

export async function cardQr(userId: string, cardId: string) {
  if (!id.safeParse(cardId).success) throw new HttpError(404, 'Card not found');
  return getDb().transaction(async tx => {
    const [row] = await tx.select().from(cards).where(and(eq(cards.userId, userId), eq(cards.id, cardId))).for('update');
    if (!row) throw new HttpError(404, 'Card not found');
    if (row.qrCodeId) return { qr_code_id: row.qrCodeId, created: false };
    const qr = await createCode(userId, { title: row.title, destination_url: publicCardUrl(row.slug), tracking_enabled: true });
    await tx.update(cards).set({ qrCodeId: qr.qrCode.id }).where(eq(cards.id, cardId));
    return { qr_code_id: qr.qrCode.id, created: true };
  });
}

const slugParam = z.string().regex(/^[a-z0-9-]{3,40}$/);
export async function publicCard(slug: string) {
  if (!slugParam.safeParse(slug).success) return null;
  const [row] = await getDb().select({ id: cards.id, userId: cards.userId, slug: cards.slug, published: cards.published })
    .from(cards).where(and(eq(cards.slug, slug), eq(cards.isPublished, true)));
  const content = row ? cardContentSchema.safeParse(row.published) : null;
  return row && content?.success ? { id: row.id, userId: row.userId, slug: row.slug, content: content.data } : null;
}

export type CardEventKind = 'view' | 'save' | 'action' | 'contact';

/** Counts a public event; bots, embedded or cross-site requests and repeats within 10 s from one trusted address are skipped. */
async function recordEvent(request: Request, cardId: string, kind: CardEventKind, target: string | null) {
  const visitor = visitorFrom(request);
  if (visitor.bot || (kind === 'view' && request.headers.get('sec-fetch-site') === 'cross-site')
    || ['image', 'script', 'style', 'iframe'].includes(request.headers.get('sec-fetch-dest') ?? '')) return;
  await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'card:' + cardId}))`);
    const [{ recent }] = await tx.select({ recent: sql<number>`count(*)::int` }).from(cardEvents)
      .where(and(eq(cardEvents.cardId, cardId), eq(cardEvents.kind, kind), sql`${cardEvents.occurredAt} >= now() - interval '60 seconds'`));
    if (recent >= 300) return;
    if (visitor.ipAddress) {
      const [{ repeats }] = await tx.select({ repeats: sql<number>`count(*)::int` }).from(cardEvents).where(and(
        eq(cardEvents.cardId, cardId), eq(cardEvents.kind, kind), sql`${cardEvents.target} is not distinct from ${target}`,
        eq(cardEvents.ipAddress, visitor.ipAddress), eq(cardEvents.userAgent, visitor.userAgent),
        sql`${cardEvents.occurredAt} >= now() - make_interval(secs => ${duplicateWindowSeconds})`));
      if (repeats > 0) return;
    }
    await tx.insert(cardEvents).values({ cardId, kind, target, deviceType: visitor.deviceType, os: visitor.os, browser: visitor.browser,
      country: visitor.country, ipAddress: visitor.ipAddress, userAgent: visitor.userAgent });
  });
}

export async function recordCardView(request: Request, slug: string) {
  const card = await publicCard(slug);
  if (!card) return false;
  await recordEvent(request, card.id, 'view', null);
  return true;
}

export async function cardAction(request: Request, slug: string, target: string) {
  const card = await publicCard(slug);
  const action = card ? cardActions(card.content).find(item => item.target === target) : undefined;
  if (!card || !action) return null;
  await recordEvent(request, card.id, 'action', action.target);
  return action.href;
}

/** vCard of the published card, with the photo embedded when it is a small image. */
export async function cardVCardFile(request: Request, slug: string) {
  const card = await publicCard(slug);
  if (!card) return null;
  let photo: { mime: string; base64: string } | undefined;
  const photoId = card.content.person.photoAssetId;
  if (photoId) {
    const [file] = await getDb().select({ mime: assets.mimeType, content: assets.content, size: assets.sizeBytes }).from(assets)
      .where(and(eq(assets.userId, card.userId), eq(assets.id, photoId), eq(assets.kind, 'image')));
    if (file && file.size <= 512 * 1024 && ['image/png', 'image/jpeg'].includes(file.mime)) photo = { mime: file.mime, base64: Buffer.from(file.content).toString('base64') };
  }
  await recordEvent(request, card.id, 'save', null);
  const { firstName, lastName } = card.content.person;
  return { text: cardVCard(card.content, { url: publicCardUrl(card.slug), photo }), filename: slugify(`${firstName} ${lastName}`) || 'contact' };
}

export async function cardMedia(slug: string, assetId: string) {
  const card = await publicCard(slug);
  if (!card || !id.safeParse(assetId).success) return null;
  if (![card.content.person.photoAssetId, card.content.person.coverAssetId].includes(assetId)) return null;
  const [row] = await getDb().select({ mimeType: assets.mimeType, content: assets.content, sha256: assets.sha256 }).from(assets)
    .where(and(eq(assets.userId, card.userId), eq(assets.id, assetId), eq(assets.kind, 'image')));
  return row ?? null;
}

/**
 * Contact exchange: the visitor must accept the purpose text shown on the card, which is stored with the contact.
 * A honeypot field, per-card and per-address limits and size limits protect the form.
 */
export async function submitCardContact(request: Request, slug: string, input: unknown) {
  const card = await publicCard(slug);
  if (!card || !card.content.exchange.enabled) throw new HttpError(404, 'This card does not accept contacts');
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, issue?.path[0] === 'consent' ? 'Accept the consent to share your details' : issue?.message === 'Leave an email or a phone number' ? issue.message : 'Check the highlighted fields');
  }
  if (parsed.data.website) return { accepted: true };
  const visitor = visitorFrom(request);
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'card-contacts:' + card.id}))`);
    const { rows } = await tx.execute<{ minute: number; hour: number; day: number; total: number; same: number }>(sql`select
        count(*) filter (where created_at >= now() - interval '1 minute')::int as minute,
        count(*) filter (where created_at >= now() - interval '1 hour')::int as hour,
        count(*) filter (where created_at >= now() - interval '1 day')::int as day,
        count(*)::int as total,
        count(*) filter (where ${visitor.ipAddress}::text is not null and ip_address = ${visitor.ipAddress} and created_at >= now() - interval '1 hour')::int as same
      from qrconnect.card_contacts where card_id = ${card.id}`);
    // Rolling limits per card also hold when no trusted address is known.
    if (rows[0].minute >= 20 || rows[0].hour >= 60 || rows[0].day >= 200 || rows[0].same >= 5) throw new HttpError(429, 'Too many contacts were sent. Try again later.');
    if (rows[0].total >= cardLimits.maxContactsPerCard) throw new HttpError(409, 'This card cannot receive more contacts right now');
    await tx.insert(cardContacts).values({
      userId: card.userId, cardId: card.id, name: parsed.data.name, email: parsed.data.email || null, phone: parsed.data.phone || null,
      company: parsed.data.company || null, message: parsed.data.message || null, consentText: card.content.exchange.purpose.slice(0, 400) || 'Share my details with the card owner.',
      ipAddress: visitor.ipAddress,
    });
    await tx.insert(cardEvents).values({ cardId: card.id, kind: 'contact', target: null, deviceType: visitor.deviceType, os: visitor.os,
      browser: visitor.browser, country: visitor.country, ipAddress: visitor.ipAddress, userAgent: visitor.userAgent });
    return { accepted: true };
  });
}

export async function listCardContacts(userId: string, query: { card: string | null; q: string }, limit = 500) {
  const escaped = query.q.replace(/[\\%_]/g, character => '\\' + character);
  const rows = await getDb().select({ contact: cardContacts, cardTitle: cards.title }).from(cardContacts)
    .innerJoin(cards, and(eq(cards.id, cardContacts.cardId), eq(cards.userId, cardContacts.userId)))
    .where(and(eq(cardContacts.userId, userId), query.card && id.safeParse(query.card).success ? eq(cardContacts.cardId, query.card) : undefined,
      query.q ? or(ilike(cardContacts.name, `%${escaped}%`), ilike(cardContacts.email, `%${escaped}%`), ilike(cardContacts.company, `%${escaped}%`)) : undefined))
    .orderBy(desc(cardContacts.createdAt), desc(cardContacts.id)).limit(limit);
  return rows.map(({ contact, cardTitle }): CardContactRecord => ({
    id: contact.id, card_id: contact.cardId, card_title: cardTitle, name: contact.name, email: contact.email, phone: contact.phone,
    company: contact.company, message: contact.message, consent_text: contact.consentText, created_at: contact.createdAt.toISOString(),
  }));
}

export async function deleteCardContact(userId: string, contactId: string) {
  if (!id.safeParse(contactId).success) throw new HttpError(404, 'Contact not found');
  const [row] = await getDb().delete(cardContacts).where(and(eq(cardContacts.userId, userId), eq(cardContacts.id, contactId))).returning({ id: cardContacts.id });
  if (!row) throw new HttpError(404, 'Contact not found');
  return { deleted: true };
}

export function cardContactsCsv(contacts: CardContactRecord[]) {
  const header = ['created_at', 'card', 'name', 'email', 'phone', 'company', 'message', 'consent'];
  const lines = [header.join(',')];
  for (const item of contacts) lines.push([item.created_at, item.card_title, item.name, item.email ?? '', item.phone ?? '', item.company ?? '', item.message ?? '', item.consent_text]
    .map(value => csvCell(value)).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
