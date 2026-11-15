import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { createForm, listForms } from '@/server/forms';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return Response.json({ forms: await listForms(user.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const result = await createForm(user.id, await readJson(request));
    return Response.json({ form: result.form }, { status: result.created ? 201 : 200, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
