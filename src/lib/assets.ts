/** Shared contract of the asset library (client and server). */
export const assetLimits = {
  /** Below the 4.5 MB request body limit of Vercel functions. */
  maxFileBytes: 4 * 1024 * 1024,
  maxAccountBytes: 50 * 1024 * 1024,
  maxAccountFiles: 500,
  maxNameLength: 120,
  pageSize: 24,
} as const;

export const assetKinds = ['image', 'document'] as const;
export type AssetKind = (typeof assetKinds)[number];

/** SVG is not accepted: it can carry scripts and would need sanitizing before it is served. */
export const assetMimeTypes = {
  'image/png': { kind: 'image', extension: 'png' },
  'image/jpeg': { kind: 'image', extension: 'jpg' },
  'image/webp': { kind: 'image', extension: 'webp' },
  'image/gif': { kind: 'image', extension: 'gif' },
  'application/pdf': { kind: 'document', extension: 'pdf' },
} as const satisfies Record<string, { kind: AssetKind; extension: string }>;
export type AssetMimeType = keyof typeof assetMimeTypes;
export const assetAccept = Object.keys(assetMimeTypes).join(',');

export type AssetRecord = {
  id: string;
  name: string;
  kind: AssetKind;
  mime_type: AssetMimeType;
  size_bytes: number;
  width: number | null;
  height: number | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  qr_uses: number;
};
export type AssetFolder = { id: string; name: string; files: number };
export type AssetUsage = { bytes: number; files: number; maxBytes: number; maxFiles: number };
export type AssetPage = { items: AssetRecord[]; total: number; page: number; pageCount: number; usage: AssetUsage; folders: AssetFolder[] };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);
const ascii = (bytes: Uint8Array, offset: number, text: string) =>
  startsWith(bytes, Array.from(text, character => character.charCodeAt(0)), offset);

/** Detects the real type from the file signature; the browser-declared type and extension are ignored. */
export function sniffAssetType(bytes: Uint8Array): AssetMimeType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) return 'image/webp';
  if (ascii(bytes, 0, 'GIF87a') || ascii(bytes, 0, 'GIF89a')) return 'image/gif';
  if (ascii(bytes, 0, '%PDF-')) return 'application/pdf';
  return null;
}

const u16be = (bytes: Uint8Array, offset: number) => (bytes[offset] << 8) | bytes[offset + 1];
const u16le = (bytes: Uint8Array, offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
const u24le = (bytes: Uint8Array, offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
const u32be = (bytes: Uint8Array, offset: number) => ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];

/** Reads pixel dimensions from image headers; returns null when the header is truncated or unknown. */
export function imageDimensions(bytes: Uint8Array, type: AssetMimeType): { width: number; height: number } | null {
  try {
    if (type === 'image/png' && bytes.length >= 24 && ascii(bytes, 12, 'IHDR')) return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
    if (type === 'image/gif' && bytes.length >= 10) return { width: u16le(bytes, 6), height: u16le(bytes, 8) };
    if (type === 'image/webp' && bytes.length >= 30) {
      if (ascii(bytes, 12, 'VP8X')) return { width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1 };
      if (ascii(bytes, 12, 'VP8L')) {
        const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (ascii(bytes, 12, 'VP8 ')) return { width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
    }
    if (type === 'image/jpeg') {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) return null;
        const marker = bytes[offset + 1];
        const length = u16be(bytes, offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: u16be(bytes, offset + 7), height: u16be(bytes, offset + 5) };
        offset += 2 + length;
      }
    }
  } catch { /* malformed header */ }
  return null;
}

/** Names are labels only: trimmed, without control characters or path separators. */
export function cleanAssetName(value: string) {
  const name = Array.from(value.normalize('NFC').replace(/[\u0000-\u001f\u007f/\\]|[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').trim()).slice(0, assetLimits.maxNameLength).join('').trim();
  return name || null;
}

export function formatBytes(bytes: number, language = 'en') {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: unit ? 1 : 0 }).format(value)} ${units[unit]}`;
}
