import { sql } from 'drizzle-orm';
import { customType, pgSchema, uuid, text, timestamp, boolean, index, integer, varchar, jsonb, unique, uniqueIndex, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
import type { QRDesign } from '@/lib/qr-design';
import type { QRContent } from '@/lib/qr-content';

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
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
}, table => [uniqueIndex('qr_folders_user_name_idx').on(table.userId, sql`lower(${table.name})`)]).enableRLS();

export const qrLabels = appSchema.table('qr_labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
}, table => [
  unique('qr_labels_user_id_unique').on(table.userId, table.id),
  uniqueIndex('qr_labels_user_name_idx').on(table.userId, sql`lower(${table.name})`),
]).enableRLS();

export const qrCodes = appSchema.table('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  shortCode: varchar('short_code', { length: 20 }).notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  title: varchar('title', { length: 255 }),
  qrType: varchar('qr_type', { length: 50 }).notNull().default('website'),
  design: jsonb('design').$type<QRDesign>(),
  content: jsonb('content').$type<QRContent>(),
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
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [unique('asset_folders_user_name_unique').on(table.userId, table.name), unique('asset_folders_user_id_unique').on(table.userId, table.id)]).enableRLS();

/** Uploaded media. File bytes live in Postgres so the hosted app needs no extra storage provider. */
export const assets = appSchema.table('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
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
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
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
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [primaryKey({ columns: [table.kind, table.slug] })]).enableRLS();

/** Digital business card: private draft and published copy, public at `/c/<slug>`. */
export const cards = appSchema.table('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
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
