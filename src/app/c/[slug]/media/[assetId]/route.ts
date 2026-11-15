import { cardMedia } from '@/server/cards';

export const runtime = 'nodejs';

/** Public images of a published card: only its own photo and cover, never any other library file. */
export async function GET(_request: Request, context: { params: Promise<{ slug: string; assetId: string }> }) {
  const { slug, assetId } = await context.params;
  const file = await cardMedia(slug, assetId).catch(() => null);
  if (!file) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(file.content), { headers: {
    'Content-Type': file.mimeType,
    'Content-Length': String(file.content.byteLength),
    'Cache-Control': 'public, max-age=300',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ETag: `"${file.sha256}"`,
  } });
}
