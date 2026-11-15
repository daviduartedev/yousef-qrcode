import { z } from 'zod';

/** Shared contract of Linkpages (client and server). */
export const linkpageLimits = { maxBlocks: 40, maxPages: 50, slugMin: 3, slugMax: 40, pageSize: 24 } as const;

const plain = (max: number) => z.string().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'Invalid characters');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const blockId = z.string().regex(/^[a-z0-9]{8,24}$/);

export const httpUrl = z.string().trim().max(2048).refine(value => !/[\r\n\t]/.test(value), 'Enter a valid HTTP/HTTPS URL').refine(value => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && Boolean(url.hostname);
  } catch { return false; }
}, 'Enter a valid HTTP/HTTPS URL').transform(value => new URL(value).href);

export const socialNetworks = ['instagram', 'facebook', 'x', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'telegram', 'github', 'website'] as const;

export const linkpageBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: blockId, type: z.literal('link'), label: plain(80).min(1), url: httpUrl }).strict(),
  z.object({ id: blockId, type: z.literal('phone'), label: plain(80).min(1), phone: z.string().trim().regex(/^\+?[0-9 ()-]{5,24}$/) }).strict(),
  z.object({ id: blockId, type: z.literal('email'), label: plain(80).min(1), email: z.email().max(254) }).strict(),
  z.object({ id: blockId, type: z.literal('social'), network: z.enum(socialNetworks), url: httpUrl }).strict(),
  z.object({ id: blockId, type: z.literal('text'), text: plain(600).min(1) }).strict(),
  z.object({ id: blockId, type: z.literal('separator') }).strict(),
]);
export type LinkpageBlock = z.infer<typeof linkpageBlockSchema>;

export const linkpageThemes = ['light', 'dark', 'ocean', 'sunset', 'forest'] as const;
export const buttonStyles = ['rounded', 'pill', 'square', 'outline'] as const;

export const linkpageContentSchema = z.object({
  version: z.literal(1),
  profile: z.object({
    name: plain(80),
    bio: plain(300),
    avatarAssetId: z.uuid().nullable(),
    coverAssetId: z.uuid().nullable(),
  }).strict(),
  theme: z.object({
    preset: z.enum(linkpageThemes),
    background: color,
    text: color,
    button: color,
    buttonText: color,
    buttonStyle: z.enum(buttonStyles),
  }).strict(),
  blocks: z.array(linkpageBlockSchema).max(linkpageLimits.maxBlocks),
}).strict().refine(content => new Set(content.blocks.map(block => block.id)).size === content.blocks.length, 'Block ids must be unique');
export type LinkpageContent = z.infer<typeof linkpageContentSchema>;

export const reservedSlugs = new Set(['admin', 'api', 'app', 'assets', 'auth', 'help', 'linkpages', 'login', 'new', 'p', 'qr', 'settings', 'support', 'www']);
export const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
export function validSlug(value: string) {
  return slugPattern.test(value) && !value.includes('--') && !reservedSlugs.has(value);
}
export function slugify(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

export function newBlockId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 12);
}

const themePresets: Record<(typeof linkpageThemes)[number], LinkpageContent['theme']> = {
  light: { preset: 'light', background: '#f8fafc', text: '#0f172a', button: '#1d4ed8', buttonText: '#ffffff', buttonStyle: 'rounded' },
  dark: { preset: 'dark', background: '#0f172a', text: '#f8fafc', button: '#f8fafc', buttonText: '#0f172a', buttonStyle: 'pill' },
  ocean: { preset: 'ocean', background: '#e0f2fe', text: '#0c4a6e', button: '#0369a1', buttonText: '#ffffff', buttonStyle: 'pill' },
  sunset: { preset: 'sunset', background: '#fff7ed', text: '#7c2d12', button: '#c2410c', buttonText: '#ffffff', buttonStyle: 'rounded' },
  forest: { preset: 'forest', background: '#ecfdf5', text: '#064e3b', button: '#047857', buttonText: '#ffffff', buttonStyle: 'square' },
};
export function themePreset(name: (typeof linkpageThemes)[number]) { return { ...themePresets[name] }; }

export const templateCategories = ['blank', 'personal', 'business', 'restaurant', 'events'] as const;
export type LinkpageTemplate = { id: string; category: (typeof templateCategories)[number]; name: string; description: string; content: () => LinkpageContent };

const block = <T extends Omit<LinkpageBlock, 'id'>>(value: T) => ({ id: newBlockId(), ...value }) as LinkpageBlock;

/** Starting points; every template is valid content and can be edited freely. */
export const linkpageTemplates: LinkpageTemplate[] = [
  { id: 'blank', category: 'blank', name: 'Blank page', description: 'Start from an empty page.', content: () => ({
    version: 1, profile: { name: '', bio: '', avatarAssetId: null, coverAssetId: null }, theme: themePreset('light'), blocks: [] }) },
  { id: 'creator', category: 'personal', name: 'Creator', description: 'Social profiles and your latest links.', content: () => ({
    version: 1, profile: { name: 'Your name', bio: 'Creator · Designer', avatarAssetId: null, coverAssetId: null }, theme: themePreset('dark'),
    blocks: [block({ type: 'link', label: 'My portfolio', url: 'https://example.com/' }), block({ type: 'link', label: 'Latest video', url: 'https://example.com/video' }),
      block({ type: 'separator' }), block({ type: 'social', network: 'instagram', url: 'https://instagram.com/' }), block({ type: 'social', network: 'youtube', url: 'https://youtube.com/' })] }) },
  { id: 'business', category: 'business', name: 'Small business', description: 'Contact options and opening hours.', content: () => ({
    version: 1, profile: { name: 'Your business', bio: 'Open Monday to Saturday, 9:00–18:00', avatarAssetId: null, coverAssetId: null }, theme: themePreset('ocean'),
    blocks: [block({ type: 'link', label: 'Visit our website', url: 'https://example.com/' }), block({ type: 'phone', label: 'Call us', phone: '+1 555 0100' }),
      block({ type: 'email', label: 'Email us', email: 'hello@example.com' }), block({ type: 'social', network: 'whatsapp', url: 'https://wa.me/15550100' })] }) },
  { id: 'restaurant', category: 'restaurant', name: 'Restaurant', description: 'Menu, reservations and directions.', content: () => ({
    version: 1, profile: { name: 'Your restaurant', bio: 'Fresh food, every day', avatarAssetId: null, coverAssetId: null }, theme: themePreset('sunset'),
    blocks: [block({ type: 'link', label: 'See the menu', url: 'https://example.com/menu' }), block({ type: 'link', label: 'Book a table', url: 'https://example.com/book' }),
      block({ type: 'link', label: 'Directions', url: 'https://maps.google.com/' }), block({ type: 'phone', label: 'Call for delivery', phone: '+1 555 0101' })] }) },
  { id: 'event', category: 'events', name: 'Event', description: 'Agenda, tickets and venue.', content: () => ({
    version: 1, profile: { name: 'Your event', bio: 'Join us on the date and venue of your event', avatarAssetId: null, coverAssetId: null }, theme: themePreset('forest'),
    blocks: [block({ type: 'link', label: 'Get tickets', url: 'https://example.com/tickets' }), block({ type: 'link', label: 'Agenda', url: 'https://example.com/agenda' }),
      block({ type: 'text', text: 'Doors open one hour before the first session.' }), block({ type: 'link', label: 'Venue map', url: 'https://maps.google.com/' })] }) },
];

/** Where a block sends the visitor; the public page routes clicks through `/p/<slug>/go/<id>` to count them. */
export function blockTarget(value: LinkpageBlock): string | null {
  switch (value.type) {
    case 'link': case 'social': return value.url;
    case 'phone': return `tel:${value.phone.replace(/[^+0-9]/g, '')}`;
    case 'email': return `mailto:${value.email}`;
    default: return null;
  }
}

export type LinkpageSummary = {
  id: string; title: string; slug: string; template: string; is_published: boolean; published_at: string | null;
  has_unpublished_changes: boolean; updated_at: string; views_30d: number; clicks_30d: number; qr_code_id: string | null;
};
export type LinkpageRecord = LinkpageSummary & { draft: LinkpageContent; published: LinkpageContent | null };
