import { z } from 'zod';
import { fieldTypes, formContentSchema, newField, type FormContent } from '@/lib/forms';
import { linkpageContentSchema, linkpageThemes, newBlockId, socialNetworks, themePreset, type LinkpageBlock, type LinkpageContent } from '@/lib/linkpages';

/** Shared contract of assisted generation (client and server). */
export const aiKinds = ['linkpage', 'form'] as const;
export type AiKind = typeof aiKinds[number];
export const aiLimits = { promptChars: 2000, sourceChars: 20000, sourcesPerWorkspace: 50, sourcesPerGeneration: 5, perDay: 20, perMonth: 200, maxOutputTokens: 8000 } as const;
/** USD per million tokens of the model in use, to show an estimated cost per generation. */
export const aiPricing = { model: 'claude-opus-5-5', inputPerMillion: 4, outputPerMillion: 20 } as const;
export const generationStatuses = ['pending_review', 'approved', 'rejected', 'failed'] as const;
export type GenerationStatus = typeof generationStatuses[number];

/** What the model returns for a Linkpage: plain fields only; ids, colors and validation are added here. */
export const linkpageDraftSchema = z.object({
  name: z.string(),
  bio: z.string(),
  theme: z.enum(linkpageThemes),
  blocks: z.array(z.object({
    type: z.enum(['link', 'phone', 'email', 'social', 'text', 'separator']),
    label: z.string(),
    value: z.string(),
    network: z.enum(socialNetworks).nullable(),
  })),
});

/** What the model returns for a form. */
export const formDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  submitLabel: z.string(),
  successMessage: z.string(),
  consentText: z.string(),
  fields: z.array(z.object({
    type: z.enum(fieldTypes),
    label: z.string(),
    help: z.string(),
    required: z.boolean(),
    options: z.array(z.string()),
  })),
});

const cut = (value: string, max: number) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);

/**
 * Turns the model output into a valid Linkpage draft. Blocks that do not validate (for example a link that is not HTTP/HTTPS)
 * are dropped, so nothing invalid reaches the editor. Returns the content and how many blocks were dropped.
 */
export function linkpageFromDraft(draft: z.infer<typeof linkpageDraftSchema>): { content: LinkpageContent; dropped: number } {
  const blocks: LinkpageBlock[] = [];
  let dropped = 0;
  for (const item of draft.blocks.slice(0, 40)) {
    const id = newBlockId();
    const candidate = item.type === 'separator' ? { id, type: 'separator' }
      : item.type === 'text' ? { id, type: 'text', text: cut(item.value || item.label, 600) }
      : item.type === 'social' ? { id, type: 'social', network: item.network ?? 'website', url: item.value.trim() }
      : item.type === 'link' ? { id, type: 'link', label: cut(item.label, 80), url: item.value.trim() }
      : item.type === 'phone' ? { id, type: 'phone', label: cut(item.label, 80), phone: item.value.trim() }
      : { id, type: 'email', label: cut(item.label, 80), email: item.value.trim() };
    const parsed = linkpageContentSchema.safeParse({ version: 1, profile: { name: '', bio: '', avatarAssetId: null, coverAssetId: null }, theme: themePreset('light'), blocks: [candidate] });
    if (parsed.success) blocks.push(parsed.data.blocks[0]); else dropped++;
  }
  dropped += Math.max(0, draft.blocks.length - 40);
  const content = linkpageContentSchema.parse({
    version: 1, profile: { name: cut(draft.name, 80), bio: cut(draft.bio, 300), avatarAssetId: null, coverAssetId: null }, theme: themePreset(draft.theme), blocks,
  });
  return { content, dropped };
}

/** Turns the model output into a valid form draft; fields that cannot be fixed are dropped. */
export function formFromDraft(draft: z.infer<typeof formDraftSchema>): { content: FormContent; dropped: number } {
  const fields = [];
  let dropped = 0;
  for (const item of draft.fields.slice(0, 30)) {
    const options = [...new Set(item.options.map(option => cut(option, 80)).filter(Boolean))].slice(0, 20);
    const field = { ...newField(item.type, cut(item.label, 120)), help: cut(item.help, 200), required: item.required, options: item.type === 'select' ? options : [] };
    if (!field.label || (item.type === 'select' && options.length < 2)) { dropped++; continue; }
    fields.push(field);
  }
  dropped += Math.max(0, draft.fields.length - 30);
  if (!fields.length) fields.push({ ...newField('long_text', 'Message'), required: true });
  const consentText = cut(draft.consentText, 400);
  const content = formContentSchema.parse({
    version: 1, title: cut(draft.title, 120) || 'Untitled form', description: cut(draft.description, 600), coverAssetId: null, fields,
    submitLabel: cut(draft.submitLabel, 40) || 'Send', successMessage: cut(draft.successMessage, 300) || 'Thank you! Your answer was received.',
    consent: { enabled: Boolean(consentText), text: consentText }, theme: themePreset('light'),
  });
  return { content, dropped };
}

/** Estimated cost in millionths of a dollar. */
export function costMicros(inputTokens: number, outputTokens: number) {
  return Math.round(inputTokens * aiPricing.inputPerMillion + outputTokens * aiPricing.outputPerMillion);
}

export type AiSourceRecord = { id: string; title: string; characters: number; created_at: string };
export type GenerationRecord = { id: string; kind: AiKind; prompt: string; status: GenerationStatus; error: string | null; dropped: number;
  preview: LinkpageContent | FormContent | null; target_id: string | null; input_tokens: number; output_tokens: number; cost_micros: number;
  created_at: string; reviewed_at: string | null };
