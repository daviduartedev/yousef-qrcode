import { listDestinationChanges } from "@/server/qr-codes";
import { apiError, privateHeaders } from "@/server/http";
import { requireApiWorkspace } from "@/server/workspace-session";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json(await listDestinationChanges(workspace.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
