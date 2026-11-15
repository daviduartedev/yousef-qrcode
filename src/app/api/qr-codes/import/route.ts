import { apiError, privateHeaders, requireSameOrigin } from "@/server/http";
import { requireApiWorkspace } from "@/server/workspace-session";
import { importQrCodes } from "@/server/qr-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    const result = await importQrCodes(workspace.id, request);
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
