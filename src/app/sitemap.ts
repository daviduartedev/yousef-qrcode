import type { MetadataRoute } from 'next';
import { getServerEnv } from '@/server/env';

export const dynamic = 'force-dynamic';

/** Public pages only; private workspace routes are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getServerEnv().appUrl;
  return [{ url: `${origin}/`, changeFrequency: 'weekly', priority: 1 }];
}
