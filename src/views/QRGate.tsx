'use client';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthCard, FormAlert } from '@/views/Auth';

type Info = { code: string; title: string | null; needsPassword: boolean; askLocation: boolean } | null;

/**
 * Shown before protected or location-aware codes. Location is requested from the browser only after the visitor
 * chooses to share it, and the code still opens when they decline.
 */
export default function QRGate({ info }: { info: Info }) {
  const { t } = useTranslation('advanced');
  const id = useId();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!info) return <AuthCard title={t('QR code unavailable')} description={t('This QR code does not exist or is not active.')}><span /></AuthCard>;

  async function open(location?: { latitude: number; longitude: number }) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/qr/unlock', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: info!.code, ...(info!.needsPassword ? { password } : {}), ...(location ? { location } : {}) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.destination !== 'string') { setError(t(typeof body.error === 'string' ? body.error : 'Could not open the QR code. Try again.')); return; }
      window.location.replace(body.destination);
    } catch {
      setError(t('Could not open the QR code. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  function shareLocation() {
    if (!navigator.geolocation) { void open(); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      position => void open({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => void open(),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (info!.needsPassword && !password) { setError(t('Enter the password')); return; }
    if (info!.askLocation) shareLocation(); else await open();
  }

  return <AuthCard title={info.title || t('Open QR code')} description={t(info.needsPassword ? 'This QR code is protected by a password.' : 'The owner of this QR code would like to know your approximate location.')}>
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div aria-live="assertive" id={`${id}-error`}><FormAlert message={error ?? undefined} /></div>
      {info.needsPassword && <div className="space-y-2">
        <label htmlFor={`${id}-password`} className="text-sm font-medium">{t('Password')}</label>
        <div className="relative">
          <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id={`${id}-password`} type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} className="ps-10" dir="ltr"
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
        </div>
      </div>}
      {info.askLocation && <p className="flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('If you agree, your browser shares an approximate location (about 1 km) with the owner. You can also continue without sharing.')}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy && <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />}
        {t(info.askLocation ? 'Share location and open' : 'Open')}
      </Button>
      {info.askLocation && <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => {
        if (info.needsPassword && !password) { setError(t('Enter the password')); return; }
        void open();
      }}>{t('Open without sharing')}</Button>}
    </form>
  </AuthCard>;
}
