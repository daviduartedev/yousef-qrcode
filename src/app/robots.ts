import type { MetadataRoute } from 'next';
import { getServerEnv } from '@/server/env';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const origin = getServerEnv().appUrl;
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/qr', '/app', '/overview', '/my-qrcodes', '/analytics', '/auth/'] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
