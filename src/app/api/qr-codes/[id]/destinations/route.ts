import { listDestinationChanges } from "@/server/qr-codes";
import { apiError, privateHeaders, requireApiUser } from "@/server/http";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    return Response.json(await listDestinationChanges(user.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
