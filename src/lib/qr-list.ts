export const qrPageSize = 20;

export type QRListQuery = {
  page: number;
  q: string;
  mode: '' | 'direct' | 'tracked';
  status: '' | 'active' | 'inactive';
};

export function readQRListQuery(params: Pick<URLSearchParams, 'get'>): QRListQuery {
  const rawPage = params.get('page') ?? '';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const mode = params.get('mode');
  const status = params.get('status');
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    q: (params.get('q') ?? '').replaceAll('\0', '').trim().slice(0, 2048),
    mode: mode === 'direct' || mode === 'tracked' ? mode : '',
    status: mode !== 'direct' && (status === 'active' || status === 'inactive') ? status : '',
  };
}

export function qrListHref(query: QRListQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.mode) params.set('mode', query.mode);
  if (query.status) params.set('status', query.status);
  if (query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return search ? `/my-qrcodes?${search}` : '/my-qrcodes';
}
