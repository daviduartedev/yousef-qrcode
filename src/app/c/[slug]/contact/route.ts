import { apiError, readJson, requireSameOrigin } from '@/server/http';
import { submitCardContact } from '@/server/cards';

export const runtime = 'nodejs';

/** Public contact exchange; no account needed, the visitor's consent is required and stored. */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    requireSameOrigin(request);
    const result = await submitCardContact(request, (await context.params).slug, await readJson(request, 4096));
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
