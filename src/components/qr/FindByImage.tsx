'use client';
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ScanSearch } from 'lucide-react';

/**
 * Finds a QR code of the workspace from a photo or screenshot. The image is decoded in the browser
 * and never uploaded; only the decoded address is sent to the search.
 */
export function FindByImage() {
  const { t } = useTranslation('workspace');
  const id = useId();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decode(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('no canvas');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const { default: jsQR } = await import('jsqr');
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
      if (!result?.data) { setMessage(t('No QR code was found in this image.')); return; }
      // POST keeps decoded content (for example Wi-Fi passwords) out of URLs, logs and history.
      const response = await fetch('/api/qr-codes/lookup', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: result.data.slice(0, 2048) }) });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.id) router.push(`/my-qrcodes?focus=${encodeURIComponent(body.id)}`);
      else setMessage(t('This QR code is not in the current workspace.'));
    } catch {
      setMessage(t('The image could not be read.'));
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-2">
    <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
      <ScanSearch className="size-4" aria-hidden="true" />{t(busy ? 'Reading image…' : 'Find by image')}
    </label>
    <input id={id} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={event => { void decode(event.target.files?.[0]); event.target.value = ''; }} />
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}
