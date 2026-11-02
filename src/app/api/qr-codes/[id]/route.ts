import { deleteCode, getCode, updateCodeDesign } from "@/server/qr-codes";
import {
  requireApiUser,
  requireSameOrigin,
  readJson,
  apiError,
  privateHeaders,
} from "@/server/http";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(request);
    return Response.json(await getCode(user.id, (await context.params).id), {
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
    const user = await requireApiUser(request);
    return Response.json(
      await updateCodeDesign(
        user.id,
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
    const user = await requireApiUser(request);
    return Response.json(await deleteCode(user.id, (await context.params).id), {
      headers: privateHeaders,
    });
  } catch (error) {
    return apiError(error);
  }
}
