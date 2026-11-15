import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { costMicros, formDraftSchema, formFromDraft, linkpageDraftSchema, linkpageFromDraft } from '../src/lib/ai.ts';

test('draft schemas convert to the structured output format', () => {
  for (const schema of [linkpageDraftSchema, formDraftSchema]) {
    const format = zodOutputFormat(schema);
    assert.equal(format.type, 'json_schema');
    assert.equal(format.schema.type, 'object');
  }
});

test('model output becomes a valid Linkpage draft; unsafe blocks are dropped', () => {
  const { content, dropped } = linkpageFromDraft({ name: 'Café\u0007 Aurora', bio: 'x'.repeat(400), theme: 'ocean', blocks: [
    { type: 'link', label: 'Menu', value: 'https://example.test/menu', network: null },
    { type: 'link', label: 'Bad', value: 'javascript:alert(1)', network: null },
    { type: 'email', label: 'Mail', value: 'not an email', network: null },
    { type: 'social', label: '', value: 'https://instagram.com/x', network: 'instagram' },
    { type: 'separator', label: '', value: '', network: null },
  ] });
  assert.equal(dropped, 2);
  assert.equal(content.profile.name, 'Café Aurora');
  assert.equal(content.profile.bio.length, 300);
  assert.equal(content.theme.preset, 'ocean');
  assert.deepEqual(content.blocks.map(block => block.type), ['link', 'social', 'separator']);
  assert.equal(new Set(content.blocks.map(block => block.id)).size, 3);
});

test('model output becomes a valid form draft with consent when personal data is collected', () => {
  const { content, dropped } = formFromDraft({ title: 'RSVP', description: '', submitLabel: '', successMessage: '', consentText: 'We use your email for event updates.', fields: [
    { type: 'email', label: 'Email', help: '', required: true, options: [] },
    { type: 'select', label: 'Only one option', help: '', required: false, options: ['A', 'A'] },
    { type: 'select', label: 'Ticket', help: '', required: false, options: ['Standard', 'VIP', 'VIP'] },
    { type: 'short_text', label: '   ', help: '', required: false, options: [] },
  ] });
  assert.equal(dropped, 2);
  assert.deepEqual(content.fields.map(field => field.label), ['Email', 'Ticket']);
  assert.deepEqual(content.fields[1].options, ['Standard', 'VIP']);
  assert.equal(content.submitLabel, 'Send');
  assert.equal(content.consent.enabled, true);
  assert.equal(formFromDraft({ title: '', description: '', submitLabel: '', successMessage: '', consentText: '', fields: [] }).content.fields.length, 1, 'a form always has a field');
});

test('cost estimate in millionths of a dollar', () => {
  assert.equal(costMicros(1_000_000, 0), 4_000_000);
  assert.equal(costMicros(1200, 400), 12_800);
});
