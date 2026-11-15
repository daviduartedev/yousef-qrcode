import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteForm, getForm, updateForm } from '@/server/forms';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

// Forms can hold 30 questions with options.
const draftLimit = 64 * 1024;

export async function GET(request: Request, context: Context) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ form: await getForm(workspace.id, (await context.params).id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ form: await updateForm(workspace.id, (await context.params).id, await readJson(request, draftLimit)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(await deleteForm(workspace.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
