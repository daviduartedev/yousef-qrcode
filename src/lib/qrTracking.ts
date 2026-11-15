import type { QRAnalyticsResponse, QRCodeRecord, QRDestinationChange } from "./qr-types";
import type { QRContent } from "./qr-content";
import type { QRDesign } from "./qr-design";
import { workspaceHeaders } from "@/lib/workspace-client";

export class QRRequestError extends Error {
  constructor(public readonly status: number) {
    super("Não foi possível concluir a operação. Tente novamente.");
  }
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...workspaceHeaders(), ...options?.headers },
    cache: "no-store",
  });
  if (!response.ok)
    throw new QRRequestError(response.status);
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
export function saveNewStaticQRCode(content: QRContent, title: string, design: QRDesign) {
  return api<SavedQRCode>("/api/qr-codes", {
    method: "POST",
    body: JSON.stringify({
      content,
      ...(title.trim() ? { title: Array.from(title.trim()).slice(0, 255).join("") } : {}),
      design,
    }),
  });
}
export function changeQRDestination(id: string, destinationUrl: string) {
  return api<SavedQRCode>("/api/qr-codes/" + encodeURIComponent(id), {
    method: "PATCH",
    body: JSON.stringify({ destination_url: destinationUrl }),
  });
}
export function getQRDestinationChanges(id: string) {
  return api<{ changes: QRDestinationChange[] }>(
    "/api/qr-codes/" + encodeURIComponent(id) + "/destinations",
  );
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
export function setQRCodeActive(id: string, active: boolean) {
  return api<SavedQRCode>("/api/qr-codes/" + encodeURIComponent(id), {
    method: "PATCH",
    body: JSON.stringify({ is_active: active }),
  });
}
export function deleteQRCode(id: string) {
  return api<{ deleted: boolean }>("/api/qr-codes/" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export const getTrackingUrl = (shortCode: string) =>
  window.location.origin + "/qr?code=" + encodeURIComponent(shortCode);
