import { cardVCardFile } from '@/server/cards';

export const runtime = 'nodejs';

/** "Save contact": a vCard 3.0 file of the published card, UTF-8 so Arabic names import correctly. */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const file = await cardVCardFile(request, (await context.params).slug).catch(() => null);
  if (!file) return new Response('Card not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(file.text, { headers: {
    'Content-Type': 'text/vcard; charset=utf-8',
    'Content-Disposition': `attachment; filename="${file.filename}.vcf"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
  } });
}
