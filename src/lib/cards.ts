import { z } from 'zod';
import { buttonStyles, httpUrl, linkpageThemes, socialNetworks, themePreset } from '@/lib/linkpages';

/** Shared contract of digital business cards (client and server). */
export const cardLimits = { maxCards: 20, maxPhones: 3, maxEmails: 3, maxLinks: 8, maxContactsPerCard: 5000, vcardMaxBytes: 64 * 1024 } as const;

const plain = (max: number) => z.string().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'Invalid characters');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{5,24}$/);

export const cardContentSchema = z.object({
  version: z.literal(1),
  person: z.object({
    firstName: plain(60).min(1),
    lastName: plain(60),
    title: plain(80),
    company: plain(80),
    bio: plain(400),
    photoAssetId: z.uuid().nullable(),
    coverAssetId: z.uuid().nullable(),
  }).strict(),
  contact: z.object({
    phones: z.array(z.object({ label: z.enum(['mobile', 'work', 'home']), number: phone }).strict()).max(cardLimits.maxPhones),
    emails: z.array(z.object({ label: z.enum(['work', 'personal']), address: z.email().max(254) }).strict()).max(cardLimits.maxEmails),
    website: z.union([httpUrl, z.literal('')]),
    address: plain(200),
  }).strict(),
  links: z.array(z.object({ network: z.enum(socialNetworks), url: httpUrl }).strict()).max(cardLimits.maxLinks),
  theme: z.object({
    preset: z.enum(linkpageThemes),
    background: color, text: color, button: color, buttonText: color,
    buttonStyle: z.enum(buttonStyles),
  }).strict(),
  exchange: z.object({
    enabled: z.boolean(),
    /** Shown to the visitor next to the consent checkbox. */
    purpose: plain(300),
  }).strict(),
}).strict();
export type CardContent = z.infer<typeof cardContentSchema>;

export function blankCard(firstName = ''): CardContent {
  return {
    version: 1,
    person: { firstName, lastName: '', title: '', company: '', bio: '', photoAssetId: null, coverAssetId: null },
    contact: { phones: [], emails: [], website: '', address: '' },
    links: [],
    theme: themePreset('light'),
    exchange: { enabled: true, purpose: 'Share your details so I can follow up with you.' },
  };
}

export const cardTemplates = [
  { id: 'classic', name: 'Classic', theme: 'light' },
  { id: 'night', name: 'Night', theme: 'dark' },
  { id: 'ocean', name: 'Ocean', theme: 'ocean' },
  { id: 'sunset', name: 'Sunset', theme: 'sunset' },
  { id: 'forest', name: 'Forest', theme: 'forest' },
] as const;

/** vCard 3.0 text escaping (RFC 2426): backslash, comma, semicolon and newlines. */
function escape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Folds lines longer than 75 octets without splitting UTF-8 characters (Arabic stays intact). */
function fold(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (size + bytes > (parts.length ? 74 : 75)) { parts.push(current); current = ''; size = 0; }
    current += character;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function cardVCard(content: CardContent, options: { url?: string; photo?: { mime: string; base64: string } } = {}) {
  const { person, contact } = content;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0',
    `N;CHARSET=UTF-8:${escape(person.lastName)};${escape(person.firstName)};;;`,
    `FN;CHARSET=UTF-8:${escape([person.firstName, person.lastName].filter(Boolean).join(' '))}`];
  if (person.company) lines.push(`ORG;CHARSET=UTF-8:${escape(person.company)}`);
  if (person.title) lines.push(`TITLE;CHARSET=UTF-8:${escape(person.title)}`);
  for (const item of contact.phones) lines.push(`TEL;TYPE=${item.label === 'mobile' ? 'CELL' : item.label.toUpperCase()}:${item.number.replace(/[^+0-9]/g, '')}`);
  for (const item of contact.emails) lines.push(`EMAIL;TYPE=INTERNET,${item.label === 'work' ? 'WORK' : 'HOME'}:${item.address}`);
  if (contact.website) lines.push(`URL:${contact.website}`);
  if (options.url) lines.push(`URL;TYPE=CARD:${options.url}`);
  if (contact.address) lines.push(`ADR;CHARSET=UTF-8;TYPE=WORK:;;${escape(contact.address)};;;;`);
  if (person.bio) lines.push(`NOTE;CHARSET=UTF-8:${escape(person.bio)}`);
  for (const link of content.links) lines.push(`X-SOCIALPROFILE;TYPE=${link.network}:${link.url}`);
  if (options.photo) lines.push(`PHOTO;ENCODING=b;TYPE=${options.photo.mime.split('/')[1].toUpperCase()}:${options.photo.base64}`);
  lines.push('END:VCARD');
  // Defence in depth: no value may start a new vCard property.
  return lines.map(line => fold(line.replace(/[\r\n]/g, ''))).join('\r\n') + '\r\n';
}

function unescape(value: string) {
  return value.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/** Reads the first vCard (2.1, 3.0 or 4.0) into card fields; unknown properties are ignored. */
export function parseVCard(text: string): Partial<{ firstName: string; lastName: string; title: string; company: string; bio: string;
  phones: CardContent['contact']['phones']; emails: CardContent['contact']['emails']; website: string; address: string }> | null {
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const start = unfolded.search(/^BEGIN:VCARD/im);
  if (start < 0) return null;
  const result: ReturnType<typeof parseVCard> & object = { phones: [], emails: [] };
  for (const raw of unfolded.slice(start).split(/\r?\n/)) {
    if (/^END:VCARD/i.test(raw)) break;
    const colon = raw.indexOf(':');
    if (colon < 0) continue;
    const [name, ...params] = raw.slice(0, colon).split(';');
    const value = raw.slice(colon + 1);
    const types = params.join(';').toLowerCase();
    if (/quoted-printable/i.test(types)) continue;
    switch (name.toUpperCase().replace(/^ITEM\d+\./, '')) {
      case 'N': { const [last = '', first = ''] = value.split(/(?<!\\);/); result.lastName = unescape(last).slice(0, 60); result.firstName = unescape(first).slice(0, 60); break; }
      case 'FN': if (!result.firstName) result.firstName = unescape(value).slice(0, 60); break;
      case 'ORG': result.company = unescape(value.split(/(?<!\\);/)[0]).slice(0, 80); break;
      case 'TITLE': result.title = unescape(value).slice(0, 80); break;
      case 'NOTE': result.bio = unescape(value).slice(0, 400); break;
      case 'TEL': {
        const number = value.replace(/^tel:/i, '').trim();
        if (/^\+?[0-9 ()-]{5,24}$/.test(number) && result.phones!.length < cardLimits.maxPhones)
          result.phones!.push({ label: /work/.test(types) ? 'work' : /home/.test(types) ? 'home' : 'mobile', number });
        break;
      }
      case 'EMAIL': {
        const address = value.trim();
        if (z.email().safeParse(address).success && result.emails!.length < cardLimits.maxEmails) result.emails!.push({ label: /home/.test(types) ? 'personal' : 'work', address });
        break;
      }
      case 'URL': if (!result.website && httpUrl.safeParse(value.trim()).success) result.website = value.trim(); break;
      case 'ADR': result.address = value.split(/(?<!\\);/).map(unescape).filter(Boolean).join(', ').slice(0, 200); break;
    }
  }
  return result;
}

/** Public actions of a card; each is counted through `/c/<slug>/go/<target>`. */
export function cardActions(content: CardContent) {
  const actions: { target: string; kind: 'phone' | 'email' | 'website' | 'address' | 'social'; href: string; label: string }[] = [];
  content.contact.phones.forEach((item, index) => actions.push({ target: `phone-${index}`, kind: 'phone', href: `tel:${item.number.replace(/[^+0-9]/g, '')}`, label: item.number }));
  content.contact.emails.forEach((item, index) => actions.push({ target: `email-${index}`, kind: 'email', href: `mailto:${item.address}`, label: item.address }));
  if (content.contact.website) actions.push({ target: 'website', kind: 'website', href: content.contact.website, label: new URL(content.contact.website).hostname });
  if (content.contact.address) actions.push({ target: 'address', kind: 'address', label: content.contact.address,
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.contact.address)}` });
  content.links.forEach((item, index) => actions.push({ target: `social-${index}`, kind: 'social', href: item.url, label: item.network }));
  return actions;
}

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(120).refine(value => !/[\u0000-\u001f\u007f]/.test(value)),
  email: z.union([z.email().max(254), z.literal('')]).default(''),
  phone: z.union([phone, z.literal('')]).default(''),
  company: plain(120).transform(value => value.trim()).default(''),
  message: plain(1000).transform(value => value.trim()).default(''),
  consent: z.literal(true),
  /** Honeypot: people never fill it. */
  website: z.string().max(200).optional(),
}).refine(value => value.email || value.phone, { message: 'Leave an email or a phone number', path: ['email'] });

export type CardSummary = {
  id: string; title: string; slug: string; is_published: boolean; published_at: string | null; has_unpublished_changes: boolean;
  updated_at: string; views_30d: number; saves_30d: number; contacts_total: number; qr_code_id: string | null;
};
export type CardRecord = CardSummary & { draft: CardContent; published: CardContent | null };
export type CardContactRecord = { id: string; card_id: string; card_title: string; name: string; email: string | null; phone: string | null;
  company: string | null; message: string | null; consent_text: string; created_at: string };
