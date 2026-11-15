import { z } from 'zod';
import { buttonStyles, linkpageThemes, newBlockId, themePreset } from '@/lib/linkpages';

/** Shared contract of Forms (client and server). */
export const formLimits = { maxForms: 30, maxFields: 30, maxOptions: 20, maxResponsesPerForm: 10000, maxResponsesPerOwner: 50000, maxAnswerLength: 2000, bodyBytes: 32 * 1024 } as const;

const plain = (max: number) => z.string().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'Invalid characters');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const fieldId = z.string().regex(/^[a-z0-9]{8,24}$/);

export const fieldTypes = ['short_text', 'long_text', 'email', 'phone', 'number', 'select', 'checkbox', 'date'] as const;
export type FieldType = (typeof fieldTypes)[number];

export const formFieldSchema = z.object({
  id: fieldId,
  type: z.enum(fieldTypes),
  label: plain(120).min(1),
  help: plain(200),
  required: z.boolean(),
  options: z.array(plain(80).transform(value => value.trim()).pipe(z.string().min(1))).max(formLimits.maxOptions),
  min: z.number().finite().nullable(),
  max: z.number().finite().nullable(),
}).strict().refine(field => field.type !== 'select' || field.options.length >= 2, 'A choice field needs at least two options')
  .refine(field => field.min === null || field.max === null || field.min <= field.max, 'Minimum must not exceed maximum')
  .refine(field => new Set(field.options).size === field.options.length, 'Options must be unique');
export type FormField = z.infer<typeof formFieldSchema>;

export const formContentSchema = z.object({
  version: z.literal(1),
  title: plain(120).min(1),
  description: plain(600),
  coverAssetId: z.uuid().nullable(),
  fields: z.array(formFieldSchema).min(1).max(formLimits.maxFields),
  submitLabel: plain(40).min(1),
  successMessage: plain(300).min(1),
  consent: z.object({ enabled: z.boolean(), text: plain(400) }).strict(),
  theme: z.object({ preset: z.enum(linkpageThemes), background: color, text: color, button: color, buttonText: color, buttonStyle: z.enum(buttonStyles) }).strict(),
}).strict().refine(content => new Set(content.fields.map(field => field.id)).size === content.fields.length, 'Field ids must be unique')
  .refine(content => !content.consent.enabled || content.consent.text.trim().length > 0, 'Write the consent text');
export type FormContent = z.infer<typeof formContentSchema>;

export function newField(type: FieldType, label = ''): FormField {
  return { id: newBlockId(), type, label, help: '', required: false, options: type === 'select' ? ['Option 1', 'Option 2'] : [], min: null, max: null };
}

const base = (title: string, fields: FormField[], extra: Partial<FormContent> = {}): FormContent => ({
  version: 1, title, description: '', coverAssetId: null, fields, submitLabel: 'Send', successMessage: 'Thank you! Your answer was received.',
  consent: { enabled: false, text: '' }, theme: themePreset('light'), ...extra,
});
const required = (field: FormField) => ({ ...field, required: true });

export const formTemplates = [
  { id: 'blank', name: 'Blank form', description: 'One question to start.', content: () => base('Untitled form', [required(newField('short_text', 'Your answer'))]) },
  { id: 'contact', name: 'Contact us', description: 'Name, email and message.', content: () => base('Contact us', [
    required(newField('short_text', 'Name')), required(newField('email', 'Email')), newField('phone', 'Phone'), required(newField('long_text', 'Message'))],
    { consent: { enabled: true, text: 'I agree to be contacted about my message.' } }) },
  { id: 'feedback', name: 'Feedback', description: 'Rating and comments.', content: () => base('Tell us what you think', [
    required({ ...newField('select', 'How was your experience?'), options: ['Excellent', 'Good', 'Fair', 'Poor'] }), newField('long_text', 'Comments'), newField('email', 'Email (optional)')],
    { theme: themePreset('ocean') }) },
  { id: 'event', name: 'Event registration', description: 'Attendee details and date.', content: () => base('Event registration', [
    required(newField('short_text', 'Full name')), required(newField('email', 'Email')), required({ ...newField('number', 'Number of guests'), min: 1, max: 10 }),
    newField('date', 'Arrival date'), newField('checkbox', 'I need accessibility support')], { theme: themePreset('forest'), submitLabel: 'Register' }) },
  { id: 'lead', name: 'Lead capture', description: 'Company, role and interest.', content: () => base('Request information', [
    required(newField('short_text', 'Name')), required(newField('email', 'Work email')), newField('short_text', 'Company'),
    required({ ...newField('select', 'Interested in'), options: ['Product demo', 'Pricing', 'Partnership'] })],
    { theme: themePreset('dark'), consent: { enabled: true, text: 'I agree to receive information about this request.' } }) },
] as const;

export type FormAnswer = string | number | boolean | null;

/**
 * Validates a public submission against the published fields. Unknown keys are ignored,
 * every value is checked by type, and errors are returned per field id.
 */
export function validateAnswers(content: FormContent, input: Record<string, unknown>) {
  const answers: Record<string, FormAnswer> = {};
  const errors: Record<string, string> = {};
  for (const field of content.fields) {
    const raw = Object.hasOwn(input, field.id) ? input[field.id] : undefined;
    const empty = raw === undefined || raw === null || raw === '' || (field.type === 'checkbox' && raw === false);
    if (empty) {
      if (field.required) errors[field.id] = field.type === 'checkbox' ? 'Check this box to continue' : 'This field is required';
      answers[field.id] = field.type === 'checkbox' ? false : null;
      continue;
    }
    if (field.type === 'checkbox') {
      if (typeof raw !== 'boolean') errors[field.id] = 'Invalid answer';
      else answers[field.id] = raw;
      continue;
    }
    if (field.type === 'number') {
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' && /^-?\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw) : NaN;
      if (!Number.isFinite(value)) errors[field.id] = 'Enter a number';
      else if (field.min !== null && value < field.min) errors[field.id] = 'The number is too small';
      else if (field.max !== null && value > field.max) errors[field.id] = 'The number is too large';
      else answers[field.id] = value;
      continue;
    }
    if (typeof raw !== 'string') { errors[field.id] = 'Invalid answer'; continue; }
    const text = raw.trim();
    const limit = field.type === 'long_text' ? formLimits.maxAnswerLength : 300;
    if (text.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) { errors[field.id] = 'The answer is too long or has invalid characters'; continue; }
    if (field.type === 'email' && !z.email().safeParse(text).success) { errors[field.id] = 'Enter a valid email address'; continue; }
    if (field.type === 'phone' && !/^\+?[0-9 ()-]{5,24}$/.test(text)) { errors[field.id] = 'Enter a valid phone number'; continue; }
    const day = new Date(`${text}T00:00:00Z`);
    if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== text)) {
      errors[field.id] = 'Enter a valid date';
      continue;
    }
    if (field.type === 'select' && !field.options.includes(text)) { errors[field.id] = 'Choose one of the options'; continue; }
    if ((field.type === 'short_text' || field.type === 'long_text') && field.min !== null && text.length < field.min) { errors[field.id] = 'The answer is too short'; continue; }
    answers[field.id] = text;
  }
  return { answers, errors };
}

export type FormSummary = {
  id: string; title: string; slug: string; template: string; is_published: boolean; published_at: string | null; has_unpublished_changes: boolean;
  accepting_responses: boolean; updated_at: string; views_30d: number; responses_total: number; qr_code_id: string | null;
};
export type FormRecord = FormSummary & { draft: FormContent; published: FormContent | null };
export type FormResponseRecord = { id: string; created_at: string; answers: Record<string, FormAnswer>; labels: Record<string, string>; consent_text: string | null };
