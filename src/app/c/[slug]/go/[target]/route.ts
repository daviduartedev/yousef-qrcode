import { cardAction } from '@/server/cards';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const text = { 'Content-Type': 'text/plain; charset=utf-8' };

/** Counts a contact action (call, email, website, map, social) and redirects to the published target. */
export async function GET(request: Request, context: { params: Promise<{ slug: string; target: string }> }) {
  const { slug, target } = await context.params;
  try {
    const href = /^[a-z]{4,8}(-\d{1,2})?$/.test(target) ? await cardAction(request, slug, target) : null;
    if (!href) return new Response('Action not found', { status: 404, headers: { ...noStore, ...text } });
    return new Response(null, { status: 302, headers: { ...noStore, Location: href } });
  } catch {
    return new Response('Service temporarily unavailable', { status: 503, headers: { ...noStore, ...text } });
  }
}
