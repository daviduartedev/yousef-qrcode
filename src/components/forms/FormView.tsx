'use client';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormContent, FormField } from '@/lib/forms';

/** Renders a form. `slug` is null in the editor preview, where it cannot be submitted. */
export function FormView({ content, slug, closed = false, token }: { content: FormContent; slug: string | null; closed?: boolean; token?: string }) {
  const { t } = useTranslation('forms');
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [alert, setAlert] = useState<string | null>(null);
  const { theme } = content;
  const radius = theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '4px' : '12px';
  const outline = theme.buttonStyle === 'outline';
  const button = { borderRadius: radius, background: outline ? 'transparent' : theme.button, color: outline ? theme.button : theme.buttonText, border: `2px solid ${theme.button}` };
  const field = 'min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm text-slate-900';
  const fieldId = (item: FormField) => `${id}-${item.id}`;

  function collect(form: HTMLFormElement) {
    const data = new FormData(form);
    const answers: Record<string, string | boolean> = {};
    for (const item of content.fields) answers[item.id] = item.type === 'checkbox' ? data.get(item.id) === 'on' : String(data.get(item.id) ?? '');
    return { answers, consent: data.get('consent') === 'on', company_website: String(data.get('company_website') ?? ''), form_token: token };
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug) return;
    setAlert(null);
    setState('sending');
    try {
      const response = await fetch(`/f/${encodeURIComponent(slug)}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(collect(event.currentTarget)) });
      const body = await response.json().catch(() => ({}));
      if (response.ok) { setState('sent'); return; }
      setState('idle');
      const fields = (body.fields ?? {}) as Record<string, string>;
      setErrors(fields);
      setAlert(t(typeof body.error === 'string' ? body.error : 'Could not send. Try again.'));
      const first = content.fields.find(item => fields[item.id]);
      const target = first ? first.id : fields.consent ? 'consent' : null;
      if (target) formRef.current?.querySelector<HTMLElement>(`[name="${target}"]`)?.focus();
    } catch {
      setState('idle');
      setAlert(t('Could not send. Try again.'));
    }
  }

  const describedBy = (key: string, help: boolean) => [help ? `${id}-${key}-help` : '', errors[key] ? `${id}-${key}-error` : ''].filter(Boolean).join(' ') || undefined;
  const control = (item: FormField) => {
    const common = { id: fieldId(item), name: item.id, required: item.required, 'aria-required': item.required, 'aria-invalid': Boolean(errors[item.id]),
      'aria-describedby': describedBy(item.id, Boolean(item.help)), disabled: !slug || closed };
    switch (item.type) {
      case 'long_text': return <textarea {...common} className={`${field} min-h-24 py-2`} maxLength={2000} dir="auto" />;
      case 'select': return <select {...common} className={field} defaultValue=""><option value="" disabled>{t('Choose an option')}</option>
        {item.options.map(option => <option key={option} value={option}>{option}</option>)}</select>;
      case 'checkbox': return null;
      case 'number': return <input {...common} type="number" inputMode="decimal" className={field} min={item.min ?? undefined} max={item.max ?? undefined} dir="ltr" />;
      case 'email': return <input {...common} type="email" autoComplete="email" className={field} maxLength={254} dir="ltr" />;
      case 'phone': return <input {...common} type="tel" autoComplete="tel" className={field} maxLength={24} dir="ltr" />;
      case 'date': return <input {...common} type="date" className={field} dir="ltr" />;
      default: return <input {...common} type="text" className={field} maxLength={300} dir="auto" />;
    }
  };

  return <div className="min-h-full w-full px-4 py-8" style={{ background: theme.background, color: theme.text }}>
    <div className="mx-auto w-full max-w-xl space-y-5">
      {content.coverAssetId && <img src={slug ? `/f/${slug}/media/${content.coverAssetId}` : `/api/assets/${content.coverAssetId}/file`} alt="" className="h-40 w-full rounded-xl object-cover" />}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold" dir="auto">{content.title}</h1>
        {content.description && <p className="whitespace-pre-line text-sm opacity-80" dir="auto">{content.description}</p>}
      </div>
      {closed ? <p role="status" className="rounded-xl bg-white/90 p-4 text-sm text-slate-900">{t('This form is not accepting answers right now.')}</p>
        : state === 'sent' ? <p role="status" className="rounded-xl bg-white/90 p-4 text-sm text-slate-900" dir="auto">{content.successMessage}</p>
        : <form ref={formRef} onSubmit={submit} noValidate className="space-y-4 rounded-xl bg-white/90 p-5 text-slate-900">
          {alert && <p role="alert" className="text-sm text-red-700">{alert}</p>}
          {content.fields.map(item => <div key={item.id} className="space-y-1">
            {item.type === 'checkbox'
              ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" name={item.id} id={fieldId(item)} className="mt-0.5 size-4" disabled={!slug} required={item.required}
                  aria-invalid={Boolean(errors[item.id])} aria-describedby={describedBy(item.id, Boolean(item.help))} aria-required={item.required} />
                  <span dir="auto">{item.label}{item.required && <span aria-hidden="true"> *</span>}</span></label>
              : <label htmlFor={fieldId(item)} className="block text-sm font-medium" dir="auto">{item.label}{item.required && <span aria-hidden="true"> *</span>}</label>}
            {control(item)}
            {item.help && <p id={`${id}-${item.id}-help`} className="text-xs text-slate-600" dir="auto">{item.help}</p>}
            {errors[item.id] && <p id={`${id}-${item.id}-error`} className="text-xs text-red-700">{t(errors[item.id])}</p>}
          </div>)}
          <div className="hidden" aria-hidden="true"><label>Website<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
          {content.consent.enabled && <div className="space-y-1">
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="consent" className="mt-0.5 size-4" disabled={!slug} required aria-required="true"
              aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? `${id}-consent-error` : undefined} />
              <span dir="auto">{content.consent.text}</span></label>
            {errors.consent && <p id={`${id}-consent-error`} className="text-xs text-red-700">{t(errors.consent)}</p>}
          </div>}
          <p className="text-xs text-slate-600">{t('Fields marked * are required.')}</p>
          <button type="submit" disabled={!slug || state === 'sending'} className="min-h-11 w-full font-medium" style={button}>
            {state === 'sending' ? t('Sending…') : <span dir="auto">{content.submitLabel}</span>}</button>
        </form>}
    </div>
  </div>;
}
