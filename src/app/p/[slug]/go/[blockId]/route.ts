import { linkpageClick } from '@/server/linkpages';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const text = { 'Content-Type': 'text/plain; charset=utf-8' };

/** Counts the click and sends the visitor to the block target from the published page. */
export async function GET(request: Request, context: { params: Promise<{ slug: string; blockId: string }> }) {
  const { slug, blockId } = await context.params;
  try {
    const target = /^[a-z0-9]{8,24}$/.test(blockId) ? await linkpageClick(request, slug, blockId) : null;
    if (!target) return new Response('Link not found', { status: 404, headers: { ...noStore, ...text } });
    return new Response(null, { status: 302, headers: { ...noStore, Location: target } });
  } catch {
    return new Response('Service temporarily unavailable', { status: 503, headers: { ...noStore, ...text } });
  }
}
