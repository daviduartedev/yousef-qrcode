'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assetRequest } from '@/lib/asset-client';
import type { QRDesign } from '@/lib/qr-design';

const QRCodePreview = dynamic(() => import('@/components/QRCodePreview'), { ssr: false });
type Saved = { id: string; name: string; design: QRDesign; created_at: string };

/** The workspace's own designs: save the current one and apply a saved one to this QR code. */
export function SavedTemplates({ design, onApply }: { design: QRDesign; onApply: (design: QRDesign) => void }) {
  const { t } = useTranslation('workspace');
  const id = useId();
  const [items, setItems] = useState<Saved[] | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/qr-templates', { credentials: 'same-origin' });
    setItems(response.ok ? (await response.json()).templates : []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = await assetRequest('/api/qr-templates', 'POST', { name, design });
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setName('');
    setMessage({ tone: 'success', text: t('Design saved to your templates.') });
    void load();
  }

  async function remove(item: Saved) {
    if (!window.confirm(t('Delete the template "{{name}}"? QR codes that used it keep their design.', { name: item.name }))) return;
    const result = await assetRequest(`/api/qr-templates/${item.id}`, 'DELETE');
    if (result.ok) void load(); else setMessage({ tone: 'error', text: t(result.error) });
  }

  return <section aria-labelledby={`${id}-title`} className="mt-5 space-y-3 border-t pt-4">
    <h3 id={`${id}-title`} className="text-sm font-semibold">{t('Your templates')}</h3>
    {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{message.text}</p>}
    {items && items.length === 0 && <p className="text-sm text-muted-foreground">{t('Save a design to reuse it on other QR codes of this workspace.')}</p>}
    {items && items.length > 0 && <ul className="flex flex-wrap gap-3">{items.map(item => <li key={item.id} className="flex flex-col items-center gap-1 rounded-lg border p-2">
      <button type="button" onClick={() => onApply(structuredClone(item.design))} aria-label={t('Apply {{name}}', { name: item.name })} className="rounded hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring">
        <QRCodePreview data="https://example.com" design={item.design} width={72} />
      </button>
      <span className="max-w-24 truncate text-xs" dir="auto" title={item.name}>{item.name}</span>
      <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={t('Delete {{name}}', { name: item.name })} onClick={() => void remove(item)}>
        <Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
    </li>)}</ul>}
    <form onSubmit={save} className="flex flex-wrap gap-2">
      <label htmlFor={`${id}-name`} className="sr-only">{t('Template name')}</label>
      <input id={`${id}-name`} value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder={t('Template name')} dir="auto"
        className="min-h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
      <Button type="submit" variant="outline" disabled={!name.trim()}>{t('Save current design')}</Button>
    </form>
  </section>;
}
