'use client';
import { assetLimits, type AssetRecord } from '@/lib/assets';
import { workspaceHeaders } from '@/lib/workspace-client';

/** Messages are English keys of the `assets` namespace. */
export async function uploadAssetFile(file: File, folderId: string | null): Promise<{ asset: AssetRecord } | { error: string }> {
  if (file.size > assetLimits.maxFileBytes) return { error: 'File is larger than 4 MB' };
  const form = new FormData();
  form.set('file', file);
  if (folderId) form.set('folder_id', folderId);
  try {
    const response = await fetch('/api/assets', { method: 'POST', body: form, credentials: 'same-origin', headers: workspaceHeaders() });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { error: typeof body.error === 'string' ? body.error : 'Upload failed. Try again.' };
    return { asset: body.asset as AssetRecord };
  } catch {
    return { error: 'Upload failed. Try again.' };
  }
}

export async function assetRequest(path: string, method: 'PATCH' | 'DELETE' | 'POST', body?: unknown) {
  try {
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: body === undefined ? workspaceHeaders() : { 'content-type': 'application/json', ...workspaceHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await response.json().catch(() => ({}));
    return response.ok ? { ok: true as const, value } : { ok: false as const, error: typeof value.error === 'string' ? value.error : 'Could not save the change.' };
  } catch {
    return { ok: false as const, error: 'Could not save the change.' };
  }
}
