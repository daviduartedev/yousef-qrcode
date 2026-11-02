import type { QRAnalyticsResponse, QRCodeRecord } from './qr-types';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...options?.headers },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Não foi possível concluir a operação. Tente novamente.');
  return response.json() as Promise<T>;
}

export async function createTrackedQRCode(destinationUrl: string, title?: string, qrType = 'website') {
  const result = await api<{ qrCode: QRCodeRecord; trackingUrl: string }>('/api/qr-codes', {
    method: 'POST', body: JSON.stringify({ destination_url: destinationUrl, title: title ? Array.from(title).slice(0, 255).join('') : undefined, qr_type: qrType }),
  });
  return { shortCode: result.qrCode.short_code, trackingUrl: result.trackingUrl };
}
export function getQRCodeAnalytics(shortCode: string) {
  return api<QRAnalyticsResponse>('/api/qr-codes/' + encodeURIComponent(shortCode) + '/analytics');
}
export async function getAllQRCodes() {
  return (await api<{ qrCodes: QRCodeRecord[] }>('/api/qr-codes')).qrCodes;
}
export function deleteQRCode(id: string) {
  return api<{ deleted: boolean }>('/api/qr-codes/' + encodeURIComponent(id), { method: 'DELETE' });
}

export const getTrackingUrl = (shortCode: string) => window.location.origin + '/qr?code=' + encodeURIComponent(shortCode);
