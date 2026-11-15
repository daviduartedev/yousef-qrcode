export type QRSearchResult = {
  id: string;
  title: string | null;
  destination_url: string;
};

export function normalizeQRSearch(value: string) {
  return value.replaceAll('\0', '').trim().slice(0, 2048);
}
