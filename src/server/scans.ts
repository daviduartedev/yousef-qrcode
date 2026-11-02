import 'server-only';
import { isIP } from 'node:net';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { qrCodes, qrScans } from '@/server/db/schema';
import { getServerEnv } from '@/server/env';
import { safeDestination } from '@/server/qr-codes';
import { HttpError } from '@/server/http';

const noCache = { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };
const validCode = (code: string | null): code is string => Boolean(code && /^[A-Za-z0-9_-]{1,20}$/.test(code));

function deviceInfo(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const deviceType = /ipad|tablet/.test(ua) ? 'tablet' : /mobile|android|iphone|ipod/.test(ua) ? 'mobile' : 'desktop';
  const os = /android/.test(ua) ? 'Android' : /iphone|ipad|ipod/.test(ua) ? 'iOS' : /windows/.test(ua) ? 'Windows' : /mac os|macintosh/.test(ua) ? 'macOS' : /linux/.test(ua) ? 'Linux' : 'Unknown';
  const browser = /edg/.test(ua) ? 'Edge' : /opr|opera/.test(ua) ? 'Opera' : /chrome|crios/.test(ua) ? 'Chrome' : /firefox|fxios/.test(ua) ? 'Firefox' : /safari/.test(ua) ? 'Safari' : 'Unknown';
  return { deviceType, os, browser };
}

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
          .where(and(eq(qrScans.qrCodeId, qr.id), gte(qrScans.scannedAt, new Date(Date.now() - 60000))));
        if (count >= 300) throw new HttpError(429, 'Please try this QR code again shortly');
        const userAgent = (request.headers.get('user-agent') || '').slice(0, 1024);
        const env = getServerEnv();
        const forwarded = env.trustProxyHeaders ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() : undefined;
        await tx.insert(qrScans).values({
          qrCodeId: qr.id, userAgent, ...deviceInfo(userAgent),
          ipAddress: forwarded && isIP(forwarded) ? forwarded : null,
          country: env.trustProxyHeaders ? request.headers.get('x-vercel-ip-country')?.slice(0, 100) : null,
          city: env.trustProxyHeaders ? request.headers.get('x-vercel-ip-city')?.slice(0, 100) : null,
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
