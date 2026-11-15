/**
 * Metric and lifecycle rules shared by the scan route, the Overview, the list
 * filter and the Analytics page. Every day boundary is UTC.
 */

/** Previews, crawlers and scripted clients are redirected but never counted. */
const botPattern =
  /(?<!cu)bot\b|(?<!cu)bot\/|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp\/|skypeuripreview|embedly|vkshare|w3c_validator|curl\/|wget\/|python-requests|python-urllib|go-http-client|okhttp|java\/|libwww|httpclient|scrapy|lighthouse|pingdom|uptimerobot/i;
export const isBotUserAgent = (userAgent: string) => botPattern.test(userAgent);

/** A repeat from the same network address and browser inside this window is one scan. */
export const duplicateWindowSeconds = 10;

export const lifecycleStates = ["new", "active", "declining", "no_scans", "paused"] as const;
export type LifecycleState = (typeof lifecycleStates)[number];
export const lifecycleRules = {
  /** Tracked codes created within this many days are New. */
  newDays: 7,
  /** No scan within this many days means No scans. */
  quietDays: 30,
  /** Declining compares the last window with the one before it. */
  trendDays: 14,
  /** Declining needs at least this many scans in the earlier window ... */
  trendMinimum: 4,
  /** ... and fewer than this share of them in the latest window. */
  trendRatio: 0.5,
} as const;

/** Priority: paused, new, no scans, declining, active. Mirrors the SQL in src/server/analytics.ts. */
export function lifecycleOf(input: {
  active: boolean;
  ageDays: number;
  scansQuiet: number;
  scansRecent: number;
  scansEarlier: number;
}): LifecycleState {
  if (!input.active) return "paused";
  if (input.ageDays < lifecycleRules.newDays) return "new";
  if (input.scansQuiet === 0) return "no_scans";
  if (input.scansEarlier >= lifecycleRules.trendMinimum && input.scansRecent < input.scansEarlier * lifecycleRules.trendRatio)
    return "declining";
  return "active";
}

export const analyticsDevices = ["mobile", "tablet", "desktop"] as const;
export type AnalyticsDevice = (typeof analyticsDevices)[number];
export const analyticsMaxDays = 366;
export const analyticsDefaultDays = 30;

export type AnalyticsQuery = {
  from: string;
  to: string;
  qr: string;
  device: "" | AnalyticsDevice;
  country: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dayMs = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
export function parseDay(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.valueOf()) && isoDay(date) === value && date.getUTCFullYear() >= 2000 ? date : null;
}
export const daysBetween = (from: string, to: string) =>
  Math.round((parseDay(to)!.valueOf() - parseDay(from)!.valueOf()) / dayMs) + 1;
export const addDays = (day: string, days: number) => isoDay(new Date(parseDay(day)!.valueOf() + days * dayMs));

/** Invalid or reversed ranges fall back to the last 30 UTC days ending today. */
export function readAnalyticsQuery(params: Pick<URLSearchParams, "get">, today = isoDay(new Date())): AnalyticsQuery {
  let from = params.get("from");
  let to = params.get("to");
  const validRange = parseDay(from) && parseDay(to) && from! <= to! && to! <= today && daysBetween(from!, to!) <= analyticsMaxDays;
  if (!validRange) {
    to = today;
    from = addDays(today, -(analyticsDefaultDays - 1));
  }
  const device = params.get("device");
  const country = params.get("country") ?? "";
  const qr = params.get("qr") ?? "";
  return {
    from: from!,
    to: to!,
    qr: uuid.test(qr) ? qr.toLowerCase() : "",
    device: (analyticsDevices as readonly string[]).includes(device ?? "") ? (device as AnalyticsDevice) : "",
    country: /^[\p{L}\p{N} .'-]{1,100}$/u.test(country) ? country : "",
  };
}

export function analyticsSearch(query: AnalyticsQuery) {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.qr) params.set("qr", query.qr);
  if (query.device) params.set("device", query.device);
  if (query.country) params.set("country", query.country);
  return params.toString();
}

/** Spreadsheet apps execute cells that start with these characters. */
export function csvCell(value: string | number) {
  const text = String(value);
  // Also catches leading spaces and full-width signs that some spreadsheet locales evaluate.
  const safe = /^[\s　]*[=+\-@＝＋－＠]|^[\t\r]/.test(text) ? "'" + text : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export interface AnalyticsSummary {
  scans: number;
  uniqueScanners: number;
  scansWithoutAddress: number;
}
export interface AnalyticsResponse {
  query: AnalyticsQuery;
  previous: { from: string; to: string };
  summary: AnalyticsSummary;
  previousSummary: AnalyticsSummary;
  series: { day: string; scans: number; previous: number }[];
  byQr: { id: string; title: string; scans: number }[];
  byDevice: Record<string, number>;
  byOs: Record<string, number>;
  byBrowser: Record<string, number>;
  byCountry: Record<string, number>;
  byHour: number[];
  codes: { id: string; title: string }[];
}
