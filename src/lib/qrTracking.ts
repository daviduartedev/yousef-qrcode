import type { QRAnalyticsResponse, QRCodeRecord } from "./qr-types";
import type { QRDesign } from "./qr-design";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Não foi possível concluir a operação. Tente novamente.");
  return response.json() as Promise<T>;
}

export interface SavedQRCode {
  qrCode: QRCodeRecord;
  trackingUrl: string | null;
}
export function saveNewQRCode(
  destinationUrl: string,
  title: string,
  qrType: string,
  design: QRDesign,
  trackingEnabled: boolean,
) {
  return api<SavedQRCode>("/api/qr-codes", {
    method: "POST",
    body: JSON.stringify({
      destination_url: destinationUrl,
      title: Array.from(title).slice(0, 255).join(""),
      qr_type: qrType,
      design,
      tracking_enabled: trackingEnabled,
    }),
  });
}
export function getQRCode(id: string) {
  return api<SavedQRCode>("/api/qr-codes/" + encodeURIComponent(id));
}
export function saveQRCodeDesign(id: string, design: QRDesign) {
  return api<SavedQRCode>("/api/qr-codes/" + encodeURIComponent(id), {
    method: "PATCH",
    body: JSON.stringify({ design }),
  });
}
export function getQRCodeAnalytics(shortCode: string) {
  return api<QRAnalyticsResponse>(
    "/api/qr-codes/" + encodeURIComponent(shortCode) + "/analytics",
  );
}
export async function getAllQRCodes() {
  return (await api<{ qrCodes: QRCodeRecord[] }>("/api/qr-codes")).qrCodes;
}
export function deleteQRCode(id: string) {
  return api<{ deleted: boolean }>("/api/qr-codes/" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export const getTrackingUrl = (shortCode: string) =>
  window.location.origin + "/qr?code=" + encodeURIComponent(shortCode);
