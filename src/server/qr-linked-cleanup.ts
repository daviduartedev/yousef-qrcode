import 'server-only';
import { sql } from 'drizzle-orm';
import type { getDb } from '@/server/db';
import type { LinkedQRKind } from '@/lib/qr-linked';

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/** When a linked item is deleted, every QR code that opened it stops redirecting (they would only reach a 404). */
export async function deactivateLinkedCodes(tx: Tx, workspaceId: string, kind: LinkedQRKind, id: string) {
  const result = await tx.execute(sql`update qrconnect.qr_codes set is_active = false, updated_at = now()
    where user_id = ${workspaceId} and qr_type = ${kind} and content->>'id' = ${id} and is_active`);
  return result.rowCount ?? 0;
}
