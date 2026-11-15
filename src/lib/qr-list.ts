import { lifecycleStates, type LifecycleState } from './qr-analytics';

export const qrPageSize = 20;
export const qrBulkLabelLimit = 20;

export const qrSorts = ['newest', 'oldest', 'updated', 'name', 'scans'] as const;
export const qrFilterFields = ['name', 'destination', 'mode', 'status', 'scans', 'created', 'updated'] as const;
export const qrFilterOperators = {
  name: ['contains', 'not_contains', 'is', 'is_not'],
  destination: ['contains', 'not_contains', 'is', 'is_not'],
  mode: ['is', 'is_not'],
  status: ['is', 'is_not'],
  scans: ['is', 'gte', 'lte'],
  created: ['is', 'before', 'after'],
  updated: ['is', 'before', 'after'],
} as const;

export type QRFilterField = typeof qrFilterFields[number];
export type QRFilterOperator = typeof qrFilterOperators[QRFilterField][number];
export type QRFilterRule = { field: QRFilterField; op: QRFilterOperator; value: string };
export const qrFilterLimit = 6;

export type QRListQuery = {
  page: number;
  q: string;
  mode: '' | 'direct' | 'tracked';
  status: '' | 'active' | 'inactive';
  view: 'list' | 'grid';
  sort: typeof qrSorts[number];
  rules: QRFilterRule[];
  folder: string;
  label: string;
  watch: '' | 'yes' | 'no';
  focus: string;
  lifecycle: '' | LifecycleState;
};

export const qrListKeys = ['page', 'q', 'mode', 'status', 'view', 'sort', 'rules', 'folder', 'label', 'watch', 'focus', 'lifecycle'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idParam = (value: string | null) => value && uuidPattern.test(value) ? value.toLowerCase() : '';
export const normalizeQRDigits = (value: string) => value.replace(/[٠-٩۰-۹]/g, digit =>
  String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)));
export function qrFilterDate(value: string) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function readQRFilterRules(raw: string): QRFilterRule[] {
  if (raw.length > 4096) return [];
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(input)) return [];
  return input.slice(0, qrFilterLimit).flatMap((rule: unknown) => {
    if (!Array.isArray(rule) || rule.length !== 3) return [];
    const [field, op, rawValue] = rule as unknown[];
    if (typeof field !== 'string' || !qrFilterFields.includes(field as QRFilterField) ||
      typeof op !== 'string' || !(qrFilterOperators[field as QRFilterField] as readonly string[]).includes(op) ||
      typeof rawValue !== 'string') return [];
    const cleaned = rawValue.replaceAll('\0', '').trim().slice(0, 256);
    const value = field === 'scans' ? normalizeQRDigits(cleaned) : cleaned;
    if (!value || (field === 'mode' && !['direct', 'tracked'].includes(value)) ||
      (field === 'status' && !['active', 'inactive'].includes(value)) ||
      (field === 'scans' && (!/^\d{1,10}$/.test(value) || Number(value) > 2147483647)) ||
      ((field === 'created' || field === 'updated') && !qrFilterDate(value))) return [];
    return [{ field: field as QRFilterField, op: op as QRFilterOperator, value }];
  });
}

export function encodeQRFilterRules(rules: QRFilterRule[]) {
  return JSON.stringify(rules.map(({ field, op, value }) => [field, op, value]));
}

export function readQRListQuery(params: Pick<URLSearchParams, 'get'>): QRListQuery {
  const rawPage = params.get('page') ?? '';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const mode = params.get('mode');
  const status = params.get('status');
  const folder = params.get('folder');
  const sort = params.get('sort');
  const watch = params.get('watch');
  const focus = idParam(params.get('focus'));
  const lifecycle = params.get('lifecycle');
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    q: (params.get('q') ?? '').replaceAll('\0', '').trim().slice(0, 2048),
    mode: mode === 'direct' || mode === 'tracked' ? mode : '',
    status: mode !== 'direct' && (status === 'active' || status === 'inactive') ? status : '',
    view: params.get('view') === 'grid' ? 'grid' : 'list',
    sort: qrSorts.includes(sort as QRListQuery['sort']) ? sort as QRListQuery['sort'] : 'newest',
    rules: readQRFilterRules(params.get('rules') ?? ''),
    folder: folder === 'none' ? folder : idParam(folder),
    label: idParam(params.get('label')),
    watch: watch === 'yes' || watch === 'no' ? watch : '',
    focus,
    lifecycle: (lifecycleStates as readonly string[]).includes(lifecycle ?? '') ? lifecycle as LifecycleState : '',
  };
}

export const hasQRFilters = (query: QRListQuery) => Boolean(
  query.q || query.mode || query.status || query.rules.length || query.folder || query.label || query.watch || query.focus || query.lifecycle,
);

export function clearQRFilters(query: QRListQuery): QRListQuery {
  return { ...readQRListQuery(new URLSearchParams()), view: query.view, sort: query.sort };
}

export function qrListHref(query: QRListQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.mode) params.set('mode', query.mode);
  if (query.status) params.set('status', query.status);
  if (query.view !== 'list') params.set('view', query.view);
  if (query.sort !== 'newest') params.set('sort', query.sort);
  if (query.rules.length) params.set('rules', encodeQRFilterRules(query.rules));
  if (query.folder) params.set('folder', query.folder);
  if (query.label) params.set('label', query.label);
  if (query.watch) params.set('watch', query.watch);
  if (query.focus) params.set('focus', query.focus);
  if (query.lifecycle) params.set('lifecycle', query.lifecycle);
  if (query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return search ? `/my-qrcodes?${search}` : '/my-qrcodes';
}
