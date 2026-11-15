import 'server-only';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { qrCodes, qrScans } from '@/server/db/schema';
import { safeDestination } from '@/server/qr-codes';
import { HttpError } from '@/server/http';
import { duplicateWindowSeconds } from '@/lib/qr-analytics';
import { visitorFrom } from '@/server/visitor';

const noCache = { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };
const validCode = (code: string | null): code is string => Boolean(code && /^[A-Za-z0-9_-]{1,20}$/.test(code));

export async function scanAndRedirect(request: Request, record = true) {
  try {
    const code = new URL(request.url).searchParams.get('code');
    if (!validCode(code)) throw new HttpError(404, 'QR code not found');
    const destination = await getDb().transaction(async tx => {
      const [qr] = await tx.select().from(qrCodes).where(eq(qrCodes.shortCode, code)).for('update');
      if (!qr) throw new HttpError(404, 'QR code not found');
      if (!qr.isActive) throw new HttpError(410, 'QR code is inactive');
      if (!safeDestination(qr.destinationUrl)) throw new HttpError(410, 'QR destination is unavailable');
      if (record) {
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(qrScans)
          .where(and(eq(qrScans.qrCodeId, qr.id), gte(qrScans.scannedAt, sql`now() - interval '60 seconds'`)));
        if (count >= 300) throw new HttpError(429, 'Please try this QR code again shortly');
        const visitor = visitorFrom(request);
        const { userAgent, ipAddress } = visitor;
        // Bots and immediate repeats from the same address and browser still redirect, but are not counted.
        if (visitor.bot) return new URL(qr.destinationUrl).href;
        if (ipAddress) {
          const [{ repeats }] = await tx.select({ repeats: sql<number>`count(*)::int` }).from(qrScans).where(and(
            eq(qrScans.qrCodeId, qr.id), eq(qrScans.ipAddress, ipAddress), eq(qrScans.userAgent, userAgent),
            gte(qrScans.scannedAt, sql`now() - make_interval(secs => ${duplicateWindowSeconds})`),
          ));
          if (repeats > 0) return new URL(qr.destinationUrl).href;
        }
        await tx.insert(qrScans).values({
          qrCodeId: qr.id, userAgent, deviceType: visitor.deviceType, os: visitor.os, browser: visitor.browser,
          ipAddress, country: visitor.country, city: visitor.city,
        });
        await tx.update(qrCodes).set({ totalScans: sql`${qrCodes.totalScans} + 1`, updatedAt: new Date() }).where(eq(qrCodes.id, qr.id));
      }
      return new URL(qr.destinationUrl).href;
    });
    return new Response(null, { status: 302, headers: { ...noCache, Location: destination } });
  } catch (error) {
    const known = error instanceof HttpError;
    const status = known ? error.status : 503;
    const message = known ? error.message : 'QR service is temporarily unavailable';
    return new Response(record ? `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QRConnect</title></head><body><main><h1>${message}</h1><a href="/">Return to Home</a></main></body></html>` : null,
      { status, headers: { ...noCache, 'Content-Type': 'text/html; charset=utf-8', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
  }
}
