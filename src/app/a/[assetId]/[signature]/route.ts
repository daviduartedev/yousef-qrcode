import { publicFile } from '@/server/qr-linked';
import { assetMimeTypes, type AssetMimeType } from '@/lib/assets';

export const runtime = 'nodejs';

/** Public, signed address of a library file opened by a file QR code. Deleting the file ends it. */
export async function GET(_request: Request, context: { params: Promise<{ assetId: string; signature: string }> }) {
  const { assetId, signature } = await context.params;
  const file = await publicFile(assetId, signature).catch(() => null);
  if (!file) return new Response('File not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });
  const extension = assetMimeTypes[file.mimeType as AssetMimeType]?.extension ?? 'bin';
  const filename = encodeURIComponent(file.name).replace(/['()*!]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
  return new Response(new Uint8Array(file.content), { headers: {
    'Content-Type': file.mimeType,
    'Content-Length': String(file.content.byteLength),
    'Content-Disposition': `inline; filename="file.${extension}"; filename*=UTF-8''${filename}`,
    'Cache-Control': 'private, no-cache',
    'Content-Security-Policy': file.mimeType === 'application/pdf' ? "default-src 'none'; object-src 'self'; img-src 'self'" : "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    ETag: `"${file.sha256}"`,
  } });
}
