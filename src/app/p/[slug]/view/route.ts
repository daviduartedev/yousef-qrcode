import { getServerEnv } from '@/server/env';
import { recordLinkpageView } from '@/server/linkpages';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

/** View beacon sent by the public page after it loads; crawlers that do not run scripts are not counted. */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (request.headers.get('origin') !== getServerEnv().appUrl) return new Response(null, { status: 403, headers: noStore });
  try {
    const found = await recordLinkpageView(request, (await context.params).slug);
    return new Response(null, { status: found ? 204 : 404, headers: noStore });
  } catch {
    return new Response(null, { status: 503, headers: noStore });
  }
}
