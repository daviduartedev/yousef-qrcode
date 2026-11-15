import { deleteCode, getCode, updateCode } from "@/server/qr-codes";
import {
  requireSameOrigin,
  readJson,
  apiError,
  privateHeaders,
} from "@/server/http";
import { requireApiWorkspace } from "@/server/workspace-session";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json(await getCode(workspace.id, (await context.params).id), {
      headers: privateHeaders,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(
      await updateCode(
        workspace.id,
        (await context.params).id,
        await readJson(request),
      ),
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(await deleteCode(workspace.id, (await context.params).id), {
      headers: privateHeaders,
    });
  } catch (error) {
    return apiError(error);
  }
}
