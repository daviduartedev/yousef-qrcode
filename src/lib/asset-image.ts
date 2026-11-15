'use client';
import { useEffect, useState } from 'react';

const cache = new Map<string, Promise<string | null>>();

/** Loads a library image as a data URL so it can be embedded in exported SVG and PNG files. */
export function loadAssetImage(id: string): Promise<string | null> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(`/api/assets/${encodeURIComponent(id)}/file`, { credentials: 'same-origin' })
      .then(response => response.ok ? response.blob() : null)
      .then(blob => blob && new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }))
      .catch(() => null);
    cache.set(id, pending);
    // Failed loads are retried on the next request.
    void pending.then(value => { if (!value) cache.delete(id); });
  }
  return pending;
}

export function forgetAssetImage(id: string) { cache.delete(id); }

/** `undefined` while loading, `null` when the file is missing or unreadable. */
export function useAssetImage(id: string | null | undefined): string | null | undefined {
  const [state, setState] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void loadAssetImage(id).then(url => { if (active) setState({ id, url }); });
    return () => { active = false; };
  }, [id]);
  if (!id) return null;
  return state?.id === id ? state.url : undefined;
}
