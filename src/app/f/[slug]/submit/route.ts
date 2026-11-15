import { apiError, readJson, requireSameOrigin } from '@/server/http';
import { FormValidationError, submitForm } from '@/server/forms';
import { formLimits } from '@/lib/forms';

export const runtime = 'nodejs';

/** Public answer submission; no account needed. Field errors come back per question id. */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    requireSameOrigin(request);
    const result = await submitForm(request, (await context.params).slug, await readJson(request, formLimits.bodyBytes));
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof FormValidationError) return Response.json({ error: error.message, fields: error.fields }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    return apiError(error);
  }
}
