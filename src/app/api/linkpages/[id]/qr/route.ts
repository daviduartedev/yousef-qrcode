import { apiError, privateHeaders, requireApiUser, requireSameOrigin } from '@/server/http';
import { linkpageQr } from '@/server/linkpages';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const result = await linkpageQr(user.id, (await context.params).id);
    return Response.json(result, { status: result.created ? 201 : 200, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
