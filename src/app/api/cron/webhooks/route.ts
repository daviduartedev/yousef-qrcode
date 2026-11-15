import { timingSafeEqual } from 'node:crypto';
import { processDueDeliveries } from '@/server/webhooks';

export const runtime = 'nodejs';

/** Retries due webhook deliveries. Scheduled jobs call it with an `Authorization: Bearer <CRON_SECRET>` header. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (secret.length < 16 || given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 401 });
  return Response.json({ processed: await processDueDeliveries() }, { headers: { 'Cache-Control': 'no-store' } });
}
