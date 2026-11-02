import { pgSchema, uuid, text, timestamp, boolean, index, integer, varchar, jsonb } from 'drizzle-orm/pg-core';
import type { QRDesign } from '@/lib/qr-design';

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

export const qrCodes = appSchema.table('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  shortCode: varchar('short_code', { length: 20 }).notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  title: varchar('title', { length: 255 }),
  qrType: varchar('qr_type', { length: 50 }).notNull().default('website'),
  design: jsonb('design').$type<QRDesign>(),
  trackingEnabled: boolean('tracking_enabled').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  totalScans: integer('total_scans').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [index('qr_codes_user_idx').on(table.userId)]).enableRLS();

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
