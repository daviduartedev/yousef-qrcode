'use client';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Download, Facebook, Github, Globe, Instagram, Linkedin, Mail, MapPin, MessageCircle, Music2, Phone, Send, Twitter, Youtube } from 'lucide-react';
import { cardActions, type CardContent } from '@/lib/cards';

const socialIcons = { instagram: Instagram, facebook: Facebook, x: Twitter, linkedin: Linkedin, youtube: Youtube, tiktok: Music2,
  whatsapp: MessageCircle, telegram: Send, github: Github, website: Globe } as const;
const actionIcons = { phone: Phone, email: Mail, website: Globe, address: MapPin } as const;

function ExchangeForm({ slug, purpose, style }: { slug: string | null; purpose: string; style: React.CSSProperties }) {
  const { t } = useTranslation('cards');
  const id = useId();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const field = 'min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm text-slate-900';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setError(null);
    if (data.consent !== 'on') { setError(t('Accept the consent to share your details')); return; }
    setState('sending');
    try {
      const response = await fetch(`/c/${encodeURIComponent(slug)}/contact`, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, phone: data.phone, company: data.company, message: data.message, consent: true, website: data.website }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setState('idle'); setError(t(typeof body.error === 'string' ? body.error : 'Could not send. Try again.')); return; }
      setState('sent');
    } catch { setState('idle'); setError(t('Could not send. Try again.')); }
  }

  if (state === 'sent') return <p role="status" className="rounded-md bg-white/90 p-4 text-center text-sm text-slate-900">{t('Thank you! Your details were shared.')}</p>;
  return <form onSubmit={submit} className="w-full space-y-3 rounded-xl bg-white/90 p-4 text-slate-900" aria-labelledby={`${id}-title`} noValidate>
    <h2 id={`${id}-title`} className="text-base font-semibold">{t('Share your contact')}</h2>
    {error && <p id={`${id}-error`} role="alert" tabIndex={-1} ref={node => node?.focus()} className="text-sm text-red-700">{error}</p>}
    <div className="space-y-1"><label htmlFor={`${id}-name`} className="text-xs font-medium">{t('Name')}</label><input id={`${id}-name`} name="name" required aria-required="true" aria-describedby={error ? `${id}-error` : undefined} maxLength={120} autoComplete="name" className={field} dir="auto" /></div>
    <div className="space-y-1"><label htmlFor={`${id}-email`} className="text-xs font-medium">{t('Email')} <span className="font-normal opacity-70">{t('(email or phone required)')}</span></label><input id={`${id}-email`} name="email" type="email" maxLength={254} autoComplete="email" className={field} dir="ltr" /></div>
    <div className="space-y-1"><label htmlFor={`${id}-phone`} className="text-xs font-medium">{t('Phone')}</label><input id={`${id}-phone`} name="phone" type="tel" maxLength={24} autoComplete="tel" className={field} dir="ltr" /></div>
    <div className="space-y-1"><label htmlFor={`${id}-company`} className="text-xs font-medium">{t('Company')}</label><input id={`${id}-company`} name="company" maxLength={120} autoComplete="organization" className={field} dir="auto" /></div>
    <div className="space-y-1"><label htmlFor={`${id}-message`} className="text-xs font-medium">{t('Message')}</label><textarea id={`${id}-message`} name="message" maxLength={1000} className={`${field} min-h-20 py-2`} dir="auto" /></div>
    <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="consent" required aria-required="true" aria-describedby={error ? `${id}-error` : undefined} className="mt-0.5 size-4" />
      <span dir="auto">{purpose || t('Share my details with the card owner.')} {t('Only the card owner sees what you send.')}</span></label>
    <button type="submit" disabled={state === 'sending' || !slug} className="min-h-11 w-full font-medium" style={style}>{t(state === 'sending' ? 'Sending…' : 'Send my contact')}</button>
  </form>;
}

/** Renders a digital business card. `slug` is null in the editor preview, where actions stay inert. */
export function CardView({ content, slug }: { content: CardContent; slug: string | null }) {
  const { t } = useTranslation('cards');
  const { person, theme } = content;
  const radius = theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '4px' : '12px';
  const outline = theme.buttonStyle === 'outline';
  const button = { borderRadius: radius, background: outline ? 'transparent' : theme.button, color: outline ? theme.button : theme.buttonText, border: `2px solid ${theme.button}` };
  const media = (assetId: string) => slug ? `/c/${slug}/media/${assetId}` : `/api/assets/${assetId}/file`;
  const actions = cardActions(content);
  const href = (target: string) => slug ? `/c/${slug}/go/${target}` : undefined;
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const classes = 'flex min-h-12 w-full items-center gap-3 px-4 py-3 text-start font-medium hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  return <div className="min-h-full w-full" style={{ background: theme.background, color: theme.text }}>
    {person.coverAssetId && <div className="h-36 w-full overflow-hidden"><img src={media(person.coverAssetId)} alt="" className="h-full w-full object-cover" /></div>}
    <div className={`mx-auto flex w-full max-w-md flex-col items-center gap-4 px-5 pb-10 ${person.coverAssetId ? '-mt-12' : 'pt-10'}`}>
      {person.photoAssetId && <img src={media(person.photoAssetId)} alt="" className="size-28 rounded-full border-4 object-cover" style={{ borderColor: theme.background }} />}
      <div className="text-center">
        <h1 className="text-2xl font-bold" dir="auto">{fullName}</h1>
        {(person.title || person.company) && <p className="mt-1 flex items-center justify-center gap-1 text-sm opacity-80" dir="auto">
          <Briefcase className="size-4 shrink-0" aria-hidden="true" />{[person.title, person.company].filter(Boolean).join(' · ')}</p>}
      </div>
      {person.bio && <p className="whitespace-pre-line text-center text-sm opacity-80" dir="auto">{person.bio}</p>}
      <a href={slug ? `/c/${slug}/vcard` : undefined} className={`${classes} justify-center`} style={button} download={slug ? true : undefined}>
        <Download className="size-5" aria-hidden="true" />{t('Save contact')}
      </a>
      <ul className="flex w-full flex-col gap-3">
        {actions.filter(action => action.kind !== 'social').map(action => {
          const Icon = actionIcons[action.kind as keyof typeof actionIcons];
          return <li key={action.target}><a href={href(action.target)} className={classes} style={{ ...button, background: 'transparent', color: theme.text, borderColor: `${theme.text}33` }}
            rel="noopener noreferrer nofollow" data-target={slug ? action.target : undefined}>
            <Icon className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 truncate" dir="auto">{action.label}</span>
          </a></li>;
        })}
      </ul>
      {content.links.length > 0 && <ul className="flex flex-wrap justify-center gap-2" aria-label={t('Social profiles')}>
        {actions.filter(action => action.kind === 'social').map(action => {
          const network = content.links[Number(action.target.split('-')[1])].network;
          const Icon = socialIcons[network];
          return <li key={action.target}><a href={href(action.target)} aria-label={network} rel="noopener noreferrer nofollow"
            className="flex size-12 items-center justify-center" style={{ ...button, borderRadius: '9999px' }}><Icon className="size-5" aria-hidden="true" /></a></li>;
        })}
      </ul>}
      {content.exchange.enabled && <ExchangeForm slug={slug} purpose={content.exchange.purpose} style={button} />}
    </div>
  </div>;
}
