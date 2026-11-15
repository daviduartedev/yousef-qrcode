import { sql } from 'drizzle-orm';
import { customType, doublePrecision, pgSchema, uuid, text, timestamp, boolean, index, integer, varchar, jsonb, unique, uniqueIndex, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
import type { QRDesign } from '@/lib/qr-design';
import type { QRContent } from '@/lib/qr-content';
import type { LinkedContent } from '@/lib/qr-linked';

export const appSchema = pgSchema('qrconnect');
const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const user = appSchema.table('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS();

export const session = appSchema.table('session', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [index('session_user_idx').on(table.userId)]).enableRLS();

export const account = appSchema.table('account', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [index('account_user_idx').on(table.userId)]).enableRLS();

export const verification = appSchema.table('verification', {
  id: uuid('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [index('verification_identifier_idx').on(table.identifier)]).enableRLS();

export const qrFolders = appSchema.table('qr_folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
}, table => [uniqueIndex('qr_folders_user_name_idx').on(table.userId, sql`lower(${table.name})`)]).enableRLS();

export const qrLabels = appSchema.table('qr_labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
}, table => [
  unique('qr_labels_user_id_unique').on(table.userId, table.id),
  uniqueIndex('qr_labels_user_name_idx').on(table.userId, sql`lower(${table.name})`),
]).enableRLS();

export const qrCodes = appSchema.table('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  shortCode: varchar('short_code', { length: 20 }).notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  title: varchar('title', { length: 255 }),
  qrType: varchar('qr_type', { length: 50 }).notNull().default('website'),
  design: jsonb('design').$type<QRDesign>(),
  /** Account that created the code; null for codes created before organizations or by deleted accounts. */
  /** Password hash, schedule, fallback and location consent; see src/lib/qr-rules.ts. */
  rules: jsonb('rules'),
  /** Verified custom domain printed in the code, e.g. `qr.example.com`; null uses the app address. */
  trackingHost: varchar('tracking_host', { length: 253 }),
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  content: jsonb('content').$type<QRContent | LinkedContent>(),
  trackingEnabled: boolean('tracking_enabled').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  folderId: uuid('folder_id').references(() => qrFolders.id, { onDelete: 'set null' }),
  watched: boolean('watched').notNull().default(false),
  totalScans: integer('total_scans').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  index('qr_codes_user_idx').on(table.userId),
  index('qr_codes_folder_idx').on(table.folderId),
  unique('qr_codes_user_id_unique').on(table.userId, table.id),
]).enableRLS();

export const qrCodeLabels = appSchema.table('qr_code_labels', {
  userId: uuid('user_id').notNull(),
  qrCodeId: uuid('qr_code_id').notNull(),
  labelId: uuid('label_id').notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.qrCodeId, table.labelId] }),
  index('qr_code_labels_label_idx').on(table.userId, table.labelId),
  foreignKey({ columns: [table.userId, table.qrCodeId], foreignColumns: [qrCodes.userId, qrCodes.id] }).onDelete('cascade'),
  foreignKey({ columns: [table.userId, table.labelId], foreignColumns: [qrLabels.userId, qrLabels.id] }).onDelete('cascade'),
]).enableRLS();

export const qrDestinationChanges = appSchema.table('qr_destination_changes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  qrCodeId: uuid('qr_code_id').notNull(),
  previousUrl: text('previous_url').notNull(),
  newUrl: text('new_url').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('qr_destination_changes_code_time_idx').on(table.userId, table.qrCodeId, table.changedAt),
  foreignKey({ columns: [table.userId, table.qrCodeId], foreignColumns: [qrCodes.userId, qrCodes.id] }).onDelete('cascade'),
]).enableRLS();

export const qrScans = appSchema.table('qr_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  qrCodeId: uuid('qr_code_id').notNull().references(() => qrCodes.id, { onDelete: 'cascade' }),
  scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  /** Shared only with the visitor's consent, rounded to about 1 km. */
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  userAgent: text('user_agent'),
  deviceType: varchar('device_type', { length: 50 }),
  os: varchar('os', { length: 50 }),
  browser: varchar('browser', { length: 50 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
}, table => [index('qr_scans_code_time_idx').on(table.qrCodeId, table.scannedAt)]).enableRLS();

/** One row per account email sent; used to cap how often a single account can be emailed. */
export const accountEmailDispatches = appSchema.table('account_email_dispatches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 32 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('account_email_dispatches_user_kind_time_idx').on(table.userId, table.kind, table.createdAt)]).enableRLS();

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const assetFolders = appSchema.table('asset_folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [unique('asset_folders_user_name_unique').on(table.userId, table.name), unique('asset_folders_user_id_unique').on(table.userId, table.id)]).enableRLS();

/** Uploaded media. File bytes live in Postgres so the hosted app needs no extra storage provider. */
export const assets = appSchema.table('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id'),
  name: varchar('name', { length: 120 }).notNull(),
  kind: varchar('kind', { length: 16 }).notNull(),
  mimeType: varchar('mime_type', { length: 64 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  sha256: varchar('sha256', { length: 64 }).notNull(),
  content: bytea('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('assets_user_created_idx').on(table.userId, table.createdAt),
  unique('assets_user_id_unique').on(table.userId, table.id),
  foreignKey({ columns: [table.userId, table.folderId], foreignColumns: [assetFolders.userId, assetFolders.id] }),
]).enableRLS();

/** A Linkpage keeps a private draft and the last published copy; the public URL is `/p/<slug>`. */
export const linkPages = appSchema.table('link_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 40 }).notNull().unique(),
  title: varchar('title', { length: 80 }).notNull(),
  template: varchar('template', { length: 32 }).notNull(),
  creationKey: uuid('creation_key').notNull(),
  draft: jsonb('draft').notNull(),
  published: jsonb('published'),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  qrCodeId: uuid('qr_code_id').references(() => qrCodes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  unique('link_pages_user_creation_key_unique').on(table.userId, table.creationKey),
  index('link_pages_user_updated_idx').on(table.userId, table.updatedAt),
]).enableRLS();

/** Public views and link clicks; bots and immediate repeats are not stored. */
export const linkPageEvents = appSchema.table('link_page_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => linkPages.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 8 }).notNull(),
  blockId: varchar('block_id', { length: 24 }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  deviceType: varchar('device_type', { length: 16 }).notNull(),
  os: varchar('os', { length: 32 }).notNull(),
  browser: varchar('browser', { length: 32 }).notNull(),
  country: varchar('country', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 64 }),
  userAgent: varchar('user_agent', { length: 1024 }).notNull(),
}, table => [index('link_page_events_page_time_idx').on(table.pageId, table.occurredAt)]).enableRLS();

/** Every public address ever used, per kind. Addresses are never released to another account, so printed QR codes cannot be taken over. */
export const publicSlugs = appSchema.table('public_slugs', {
  kind: varchar('kind', { length: 16 }).notNull(),
  slug: varchar('slug', { length: 40 }).notNull(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [primaryKey({ columns: [table.kind, table.slug] })]).enableRLS();

/** Digital business card: private draft and published copy, public at `/c/<slug>`. */
export const cards = appSchema.table('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 40 }).notNull().unique(),
  title: varchar('title', { length: 80 }).notNull(),
  creationKey: uuid('creation_key').notNull(),
  draft: jsonb('draft').notNull(),
  published: jsonb('published'),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  qrCodeId: uuid('qr_code_id').references(() => qrCodes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  unique('cards_user_creation_key_unique').on(table.userId, table.creationKey),
  unique('cards_user_id_unique').on(table.userId, table.id),
  index('cards_user_updated_idx').on(table.userId, table.updatedAt),
]).enableRLS();

/** Views, vCard saves and contact actions on public cards; bots and immediate repeats are not stored. */
export const cardEvents = appSchema.table('card_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 16 }).notNull(),
  target: varchar('target', { length: 24 }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  deviceType: varchar('device_type', { length: 16 }).notNull(),
  os: varchar('os', { length: 32 }).notNull(),
  browser: varchar('browser', { length: 32 }).notNull(),
  country: varchar('country', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 64 }),
  userAgent: varchar('user_agent', { length: 1024 }).notNull(),
}, table => [index('card_events_card_time_idx').on(table.cardId, table.occurredAt)]).enableRLS();

/** Contacts left by visitors through the exchange form, with the consent text they accepted. */
export const cardContacts = appSchema.table('card_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  cardId: uuid('card_id').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 254 }),
  phone: varchar('phone', { length: 32 }),
  company: varchar('company', { length: 120 }),
  message: varchar('message', { length: 1000 }),
  consentText: varchar('consent_text', { length: 400 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 64 }),
}, table => [
  index('card_contacts_user_created_idx').on(table.userId, table.createdAt),
  foreignKey({ columns: [table.userId, table.cardId], foreignColumns: [cards.userId, cards.id] }).onDelete('cascade'),
]).enableRLS();

/** A form with a private draft and the published copy that receives answers at `/f/<slug>`. */
export const forms = appSchema.table('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 40 }).notNull().unique(),
  title: varchar('title', { length: 120 }).notNull(),
  template: varchar('template', { length: 32 }).notNull(),
  creationKey: uuid('creation_key').notNull(),
  draft: jsonb('draft').notNull(),
  published: jsonb('published'),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  acceptingResponses: boolean('accepting_responses').default(true).notNull(),
  qrCodeId: uuid('qr_code_id').references(() => qrCodes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  unique('forms_user_creation_key_unique').on(table.userId, table.creationKey),
  unique('forms_user_id_unique').on(table.userId, table.id),
  index('forms_user_updated_idx').on(table.userId, table.updatedAt),
]).enableRLS();

/** Answers keep a snapshot of the question labels they were given for, so exports stay readable after edits. */
export const formResponses = appSchema.table('form_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  formId: uuid('form_id').notNull(),
  answers: jsonb('answers').notNull(),
  labels: jsonb('labels').notNull(),
  consentText: varchar('consent_text', { length: 400 }),
  ipAddress: varchar('ip_address', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('form_responses_form_created_idx').on(table.formId, table.createdAt),
  foreignKey({ columns: [table.userId, table.formId], foreignColumns: [forms.userId, forms.id] }).onDelete('cascade'),
]).enableRLS();

export const formEvents = appSchema.table('form_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 16 }).notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  deviceType: varchar('device_type', { length: 16 }).notNull(),
  ipAddress: varchar('ip_address', { length: 64 }),
  userAgent: varchar('user_agent', { length: 1024 }).notNull(),
}, table => [index('form_events_form_time_idx').on(table.formId, table.occurredAt)]).enableRLS();

/**
 * Owners of content. Every account has a personal workspace with the same id as the account,
 * so content created before organizations keeps its owner. Organizations are workspaces with members.
 */
export const workspaces = appSchema.table('workspaces', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  kind: varchar('kind', { length: 16 }).notNull(),
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const workspaceMembers = appSchema.table('workspace_members', {
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [primaryKey({ columns: [table.workspaceId, table.userId] }), index('workspace_members_user_idx').on(table.userId)]).enableRLS();

/** Pending invitations; only a hash of the token is stored. */
export const workspaceInvitations = appSchema.table('workspace_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 254 }).notNull(),
  role: varchar('role', { length: 16 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  invitedBy: uuid('invited_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, table => [index('workspace_invitations_workspace_idx').on(table.workspaceId)]).enableRLS();

/** Designs saved by a workspace for reuse in the QR editor. */
export const qrTemplates = appSchema.table('qr_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 60 }).notNull(),
  design: jsonb('design').notNull(),
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('qr_templates_user_created_idx').on(table.userId, table.createdAt)]).enableRLS();

/** Domains a workspace may use for short links; usable only after the DNS TXT record proves ownership. */
export const customDomains = appSchema.table('custom_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  hostname: varchar('hostname', { length: 253 }).notNull(),
  /** Set once a QR code uses the domain; such a domain can no longer be removed because codes may be printed. */
  everUsed: boolean('ever_used').default(false).notNull(),
  verificationToken: varchar('verification_token', { length: 64 }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  unique('custom_domains_user_id_unique').on(table.userId, table.id),
  unique('custom_domains_user_hostname_unique').on(table.userId, table.hostname),
  // Only a verified domain is exclusive, so a pending claim cannot block the real owner.
  uniqueIndex('custom_domains_verified_hostname_unique').on(table.hostname).where(sql`verified_at is not null`),
]).enableRLS();

/** Extra short codes of a QR. Every alias keeps working forever and is never given to another code. */
export const qrAliases = appSchema.table('qr_aliases', {
  alias: varchar('alias', { length: 32 }).primaryKey(),
  /** Null once the QR code is deleted: the alias stays reserved and answers 410, never reused. */
  qrCodeId: uuid('qr_code_id').references(() => qrCodes.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => workspaces.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('qr_aliases_code_idx').on(table.qrCodeId)]).enableRLS();

/** Failed password attempts on protected QR codes, used to slow down guessing. */
export const qrUnlockFailures = appSchema.table('qr_unlock_failures', {
  id: uuid('id').primaryKey().defaultRandom(),
  qrCodeId: uuid('qr_code_id').notNull().references(() => qrCodes.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 64 }),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('qr_unlock_failures_code_time_idx').on(table.qrCodeId, table.occurredAt)]).enableRLS();

/** Keys for the public API. Only a SHA-256 hash is stored; the key is shown once when created. */
export const apiKeys = appSchema.table('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 60 }).notNull(),
  prefix: varchar('prefix', { length: 12 }).notNull().unique(),
  keyHash: varchar('key_hash', { length: 64 }).notNull(),
  scopes: jsonb('scopes').$type<string[]>().notNull(),
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, table => [index('api_keys_user_idx').on(table.userId)]).enableRLS();

/** Fixed one-minute windows per key for the request quota. */
export const apiKeyUsage = appSchema.table('api_key_usage', {
  keyId: uuid('key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  requests: integer('requests').notNull(),
}, table => [primaryKey({ columns: [table.keyId, table.windowStart] })]).enableRLS();

/** Outgoing webhooks. The signing secret is encrypted with the server secret (AES-256-GCM). */
export const webhooks = appSchema.table('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 2048 }).notNull(),
  events: jsonb('events').$type<string[]>().notNull(),
  secretEncrypted: varchar('secret_encrypted', { length: 1000 }).notNull(),
  active: boolean('active').default(true).notNull(),
  /** 'webhook' for signed webhooks; otherwise the integration connector (slack, hubspot, ga4). */
  kind: varchar('kind', { length: 16 }).default('webhook').notNull(),
  label: varchar('label', { length: 80 }),
  /** Non-secret connector settings, such as the GA4 measurement id and a hint of the credential. */
  config: jsonb('config').$type<Record<string, string>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('webhooks_user_idx').on(table.userId, table.kind)]).enableRLS();

export const webhookDeliveries = appSchema.table('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull(),
  event: varchar('event', { length: 40 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 16 }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
  lastStatusCode: integer('last_status_code'),
  lastError: varchar('last_error', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
}, table => [index('webhook_deliveries_hook_created_idx').on(table.webhookId, table.createdAt), index('webhook_deliveries_due_idx').on(table.status, table.nextAttemptAt)]).enableRLS();

/** Text the assisted creation may draw facts from; private to the workspace. */
export const aiSources = appSchema.table('ai_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 80 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('ai_sources_user_idx').on(table.userId)]).enableRLS();

/** Each request to the assistant: the review queue, the usage quota and the cost estimate. */
export const aiGenerations = appSchema.table('ai_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  kind: varchar('kind', { length: 16 }).notNull(),
  prompt: text('prompt').notNull(),
  status: varchar('status', { length: 16 }).notNull(),
  error: varchar('error', { length: 200 }),
  output: jsonb('output'),
  dropped: integer('dropped').default(0).notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  costMicros: integer('cost_micros').default(0).notNull(),
  targetId: uuid('target_id'),
  reviewedBy: uuid('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('ai_generations_user_created_idx').on(table.userId, table.createdAt)]).enableRLS();
