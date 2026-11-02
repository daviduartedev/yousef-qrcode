import { codeAnalytics } from '@/server/analytics';
import { requireApiUser, apiError, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    return Response.json(await codeAnalytics(user.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
