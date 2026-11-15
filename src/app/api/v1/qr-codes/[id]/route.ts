import { publicApi, readApiJson } from '@/server/public-api';
import { deleteCode, getCode, updateCode } from '@/server/qr-codes';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return publicApi(request, 'qr:read', async caller => ({ body: await getCode(caller.workspaceId, (await context.params).id) }));
}

/** PATCH accepts one of: { destination_url }, { is_active }, { design }. */
export async function PATCH(request: Request, context: Context) {
  return publicApi(request, 'qr:write', async caller => ({ body: await updateCode(caller.workspaceId, (await context.params).id, await readApiJson(request)) }));
}

export async function DELETE(request: Request, context: Context) {
  return publicApi(request, 'qr:write', async caller => {
    await deleteCode(caller.workspaceId, (await context.params).id);
    return { body: { deleted: true } };
  });
}
