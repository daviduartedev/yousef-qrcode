'use client';
import { useEffect } from 'react';

/** Reports one view after the page is shown in a browser; prefetches and crawlers without scripts are not counted. */
export function CardViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const url = `/c/${encodeURIComponent(slug)}/view`;
    if (!navigator.sendBeacon?.(url)) void fetch(url, { method: 'POST', keepalive: true, credentials: 'omit' }).catch(() => {});
  }, [slug]);
  return null;
}
