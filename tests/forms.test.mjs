import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formContentSchema, formTemplates, newField, validateAnswers } from '../src/lib/forms.ts';

const form = () => {
  const base = formTemplates.find(item => item.id === 'blank').content();
  return formContentSchema.parse({ ...base, fields: [
    { ...newField('short_text', 'Name'), required: true },
    { ...newField('email', 'Email'), required: true },
    { ...newField('number', 'Guests'), min: 1, max: 10 },
    { ...newField('select', 'Size'), options: ['S', 'M ', 'L'] },
    { ...newField('date', 'Day') },
    { ...newField('checkbox', 'Accept rules'), required: true },
  ] });
};

test('every template is a valid form', () => {
  for (const template of formTemplates) assert.ok(formContentSchema.safeParse(template.content()).success, template.id);
});

test('answers are validated by type, trimmed and limited to published questions', () => {
  const content = form();
  const [name, email, guests, size, day, rules] = content.fields;
  assert.deepEqual(size.options, ['S', 'M', 'L'], 'options are trimmed');
  const ok = validateAnswers(content, { [name.id]: '  Ana ', [email.id]: 'ana@example.com', [guests.id]: '3', [size.id]: 'M', [day.id]: '2026-02-28', [rules.id]: true, extra: 'ignored' });
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.answers, { [name.id]: 'Ana', [email.id]: 'ana@example.com', [guests.id]: 3, [size.id]: 'M', [day.id]: '2026-02-28', [rules.id]: true });
  const bad = validateAnswers(content, { [name.id]: '', [email.id]: 'nope', [guests.id]: '11', [size.id]: 'XL', [day.id]: '2026-02-31', [rules.id]: false });
  assert.deepEqual(Object.keys(bad.errors).sort(), [name.id, email.id, guests.id, size.id, day.id, rules.id].sort());
  assert.equal(bad.errors[guests.id], 'The number is too large');
  assert.equal(bad.errors[rules.id], 'Check this box to continue');
  assert.equal(validateAnswers(content, { [name.id]: 'x'.repeat(301), [email.id]: 'a@b.co', [rules.id]: true }).errors[name.id], 'The answer is too long or has invalid characters');
  assert.equal(validateAnswers(content, { [name.id]: { toString: () => 'x' }, [email.id]: 'a@b.co', [rules.id]: true }).errors[name.id], 'Invalid answer');
});

test('forms need questions, two distinct options per choice and consent text when consent is on', () => {
  const content = form();
  assert.equal(formContentSchema.safeParse({ ...content, fields: [] }).success, false);
  assert.equal(formContentSchema.safeParse({ ...content, fields: [{ ...newField('select', 'Pick'), options: ['A'] }] }).success, false);
  assert.equal(formContentSchema.safeParse({ ...content, fields: [{ ...newField('select', 'Pick'), options: ['A', 'A '] }] }).success, false);
  assert.equal(formContentSchema.safeParse({ ...content, consent: { enabled: true, text: ' ' } }).success, false);
});
