import { z } from 'zod';

/** Advanced behaviour of a tracked QR code, checked by the redirect before it sends people on. */
export const timezoneSchema = z.string().max(64).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}, 'Choose a valid time zone');

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/);

export const scheduleSchema = z.object({
  timezone: timezoneSchema,
  /** Local date-times in the chosen time zone; either may be empty. */
  startsAt: localDateTime.nullable(),
  endsAt: localDateTime.nullable(),
  /** 0 = Sunday … 6 = Saturday; empty means every day. */
  days: z.array(z.number().int().min(0).max(6)).max(7),
  /** Daily window in the chosen time zone; both or neither. */
  from: time.nullable(),
  to: time.nullable(),
}).strict()
  .refine(value => !value.startsAt || !value.endsAt || value.startsAt < value.endsAt, 'The end must be after the start')
  .refine(value => (value.from === null) === (value.to === null), 'Set both daily times or neither')
  .refine(value => new Set(value.days).size === value.days.length, 'Days must be unique');
export type QRSchedule = z.infer<typeof scheduleSchema>;

/** What the owner sends; the password is hashed on the server and never returned. */
export const rulesInputSchema = z.object({
  password: z.union([z.string().min(6).max(128), z.null()]).optional(),
  schedule: scheduleSchema.nullable().optional(),
  fallbackUrl: z.union([z.string().trim().max(2048), z.null()]).optional(),
  askLocation: z.boolean().optional(),
}).strict();

export type QRRulesView = { hasPassword: boolean; schedule: QRSchedule | null; fallbackUrl: string | null; askLocation: boolean };

/** Local wall-clock parts of `instant` in `timezone`. */
export function zonedParts(instant: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(instant).map(part => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { local: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`, weekday, time: `${parts.hour}:${parts.minute}` };
}

/** Whether a schedule allows scans at `instant`. Daily windows may cross midnight (e.g. 22:00–02:00). */
export function scheduleOpen(schedule: QRSchedule, instant = new Date()) {
  const now = zonedParts(instant, schedule.timezone);
  if (schedule.startsAt && now.local < schedule.startsAt) return { open: false as const, reason: 'not-started' as const };
  if (schedule.endsAt && now.local >= schedule.endsAt) return { open: false as const, reason: 'ended' as const };
  if (schedule.days.length && !schedule.days.includes(now.weekday)) return { open: false as const, reason: 'closed' as const };
  if (schedule.from && schedule.to) {
    const inside = schedule.from <= schedule.to ? now.time >= schedule.from && now.time < schedule.to : now.time >= schedule.from || now.time < schedule.to;
    if (!inside) return { open: false as const, reason: 'closed' as const };
  }
  return { open: true as const, reason: null };
}

export const aliasPattern = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/;
export const reservedAliases = new Set(['admin', 'api', 'app', 'auth', 'qr', 'www', 'help', 'login', 'settings']);
export const validAlias = (value: string) => aliasPattern.test(value) && !value.includes('--') && !reservedAliases.has(value);

/** Coordinates are rounded to about 1 km before they are stored. */
export const roundCoordinate = (value: number) => Math.round(value * 100) / 100;

/** Address printed in a tracked QR: the verified custom domain when one is set, otherwise the app. */
export function trackingUrlFor(origin: string, record: { short_code: string; tracking_host?: string | null }) {
  return record.tracking_host
    ? `https://${record.tracking_host}/r/${encodeURIComponent(record.short_code)}`
    : `${origin}/qr?code=${encodeURIComponent(record.short_code)}`;
}
