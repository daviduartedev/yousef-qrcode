import { apiError, privateHeaders, requireApiUser } from '@/server/http';
import { formResponsesCsv, listFormResponses } from '@/server/forms';

export const runtime = 'nodejs';

/** Answers of one form; `?format=csv` downloads all of them. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const formId = (await context.params).id;
    const params = new URL(request.url).searchParams;
    if (params.get('format') === 'csv') {
      const { csv, slug } = await formResponsesCsv(user.id, formId);
      return new Response(csv, { headers: { ...privateHeaders, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="form-${slug}-answers.csv"` } });
    }
    const page = Number(params.get('page'));
    return Response.json(await listFormResponses(user.id, formId, Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
