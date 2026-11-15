import 'server-only';
import { isIP } from 'node:net';
import { getServerEnv } from '@/server/env';
import { isBotUserAgent } from '@/lib/qr-analytics';

export function deviceInfo(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const deviceType = /ipad|tablet/.test(ua) ? 'tablet' : /mobile|android|iphone|ipod/.test(ua) ? 'mobile' : 'desktop';
  const os = /android/.test(ua) ? 'Android' : /iphone|ipad|ipod/.test(ua) ? 'iOS' : /windows/.test(ua) ? 'Windows' : /mac os|macintosh/.test(ua) ? 'macOS' : /linux/.test(ua) ? 'Linux' : 'Unknown';
  const browser = /edg/.test(ua) ? 'Edge' : /opr|opera/.test(ua) ? 'Opera' : /chrome|crios/.test(ua) ? 'Chrome' : /firefox|fxios/.test(ua) ? 'Firefox' : /safari/.test(ua) ? 'Safari' : 'Unknown';
  return { deviceType, os, browser };
}

/** Request facts shared by QR scans and public pages. Addresses and location only come from a trusted proxy. */
export function visitorFrom(request: Request) {
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 1024);
  const env = getServerEnv();
  const forwarded = env.trustProxyHeaders ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() : undefined;
  return {
    userAgent,
    bot: isBotUserAgent(userAgent),
    ipAddress: forwarded && isIP(forwarded) ? forwarded : null,
    country: env.trustProxyHeaders ? request.headers.get('x-vercel-ip-country')?.slice(0, 100) ?? null : null,
    city: env.trustProxyHeaders ? request.headers.get('x-vercel-ip-city')?.slice(0, 100) ?? null : null,
    ...deviceInfo(userAgent),
  };
}
