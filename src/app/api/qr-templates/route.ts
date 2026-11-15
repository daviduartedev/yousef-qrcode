import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { listTemplates, saveTemplate } from '@/server/qr-templates';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ templates: await listTemplates(workspace.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ template: await saveTemplate(workspace.id, await readJson(request, 16 * 1024), workspace.userId) }, { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
