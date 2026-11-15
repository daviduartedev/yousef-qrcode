import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankCard, cardActions, cardContentSchema, cardVCard, contactInputSchema, parseVCard } from '../src/lib/cards.ts';

const arabicCard = () => ({
  ...blankCard('سارة'),
  person: { ...blankCard('سارة').person, lastName: 'الحداد', title: 'مديرة المبيعات', company: 'شركة; المثال, المحدودة', bio: 'سطر أول\nسطر ثانٍ' },
  contact: { phones: [{ label: 'mobile', number: '+966 50 000 0000' }], emails: [{ label: 'work', address: 'sara@example.com' }], website: 'https://example.com/', address: 'الرياض، حي الملقا' },
  links: [{ network: 'linkedin', url: 'https://linkedin.com/in/sara' }],
});

test('vCards are UTF-8, escaped and folded without breaking Arabic characters', () => {
  const content = cardContentSchema.parse(arabicCard());
  const text = cardVCard(content, { url: 'https://app.example/c/sara' });
  assert.match(text, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
  assert.match(text, /\r\nEND:VCARD\r\n$/);
  const unfolded = text.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('N;CHARSET=UTF-8:الحداد;سارة;;;'));
  assert.ok(unfolded.includes('ORG;CHARSET=UTF-8:شركة\\; المثال\\, المحدودة'));
  assert.ok(unfolded.includes('NOTE;CHARSET=UTF-8:سطر أول\\nسطر ثانٍ'));
  assert.ok(unfolded.includes('TEL;TYPE=CELL:+966500000000'));
  assert.ok(unfolded.includes('URL;TYPE=CARD:https://app.example/c/sara'));
  for (const line of text.split('\r\n')) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `line too long: ${line}`);
    assert.ok(!line.includes('�'));
  }
});

test('vCard import reads 3.0 and 4.0 files and the exported card round-trips', () => {
  const content = cardContentSchema.parse(arabicCard());
  const back = parseVCard(cardVCard(content));
  assert.equal(back.firstName, 'سارة');
  assert.equal(back.lastName, 'الحداد');
  assert.equal(back.company, 'شركة; المثال, المحدودة');
  assert.equal(back.bio, 'سطر أول\nسطر ثانٍ');
  assert.deepEqual(back.phones, [{ label: 'mobile', number: '+966500000000' }]);
  assert.deepEqual(back.emails, [{ label: 'work', address: 'sara@example.com' }]);
  const v4 = parseVCard('BEGIN:VCARD\nVERSION:4.0\nFN:Ana Souza\nN:Souza;Ana;;;\nTEL;TYPE=work,voice;VALUE=uri:tel:+55-11-5555-0000\nEMAIL;TYPE=home:ana@example.com\nURL:javascript:alert(1)\nEND:VCARD');
  assert.equal(v4.firstName, 'Ana');
  assert.deepEqual(v4.phones, [{ label: 'work', number: '+55-11-5555-0000' }]);
  assert.deepEqual(v4.emails, [{ label: 'personal', address: 'ana@example.com' }]);
  assert.equal(v4.website, undefined, 'unsafe URLs are ignored');
  assert.equal(parseVCard('not a card'), null);
});

test('card actions only produce safe targets and contact exchange requires consent and a way to reply', () => {
  const content = cardContentSchema.parse(arabicCard());
  const actions = cardActions(content);
  assert.deepEqual(actions.map(item => item.target), ['phone-0', 'email-0', 'website', 'address', 'social-0']);
  assert.ok(actions.every(item => /^(https:|tel:|mailto:)/.test(item.href)));
  assert.equal(cardContentSchema.safeParse({ ...content, contact: { ...content.contact, website: 'javascript:alert(1)' } }).success, false);
  assert.equal(contactInputSchema.safeParse({ name: 'Ana', email: 'ana@example.com', consent: false }).success, false);
  assert.equal(contactInputSchema.safeParse({ name: 'Ana', consent: true }).success, false);
  assert.equal(contactInputSchema.safeParse({ name: 'Ana', phone: '+55 11 5555 0000', consent: true }).success, true);
});

test('addresses with line breaks are refused and vCard values cannot start new properties', () => {
  const content = cardContentSchema.parse(arabicCard());
  const injected = { ...content, contact: { ...content.contact, website: 'https://example.com/x\nEND:VCARD' } };
  assert.equal(cardContentSchema.safeParse(injected).success, false);
  const accented = cardContentSchema.parse({ ...content, contact: { ...content.contact, website: 'https://example.com/مرحبا' } });
  assert.equal(accented.contact.website, 'https://example.com/%D9%85%D8%B1%D8%AD%D8%A8%D8%A7');
  const forged = cardVCard({ ...content, links: [{ network: 'x', url: 'https://x.com/a\r\nTEL:+19005550000' }] });
  assert.equal(forged.split('\r\n').filter(line => line.startsWith('TEL')).length, 1);
  assert.equal(contactInputSchema.safeParse({ name: 'Ana', email: 'ana@example.com', company: 'Acme\u0007', consent: true }).success, false);
});
