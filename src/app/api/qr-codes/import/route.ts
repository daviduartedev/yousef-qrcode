import { apiError, privateHeaders, requireApiUser, requireSameOrigin } from "@/server/http";
import { importQrCodes } from "@/server/qr-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const result = await importQrCodes(user.id, request);
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
