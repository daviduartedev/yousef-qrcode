import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectorInput, ga4Event, hubspotContact, slackText } from '../src/lib/integrations.ts';

// Dummy token, assembled so secret scanners do not mistake it for a real one.
const fakeToken = ['pat', 'eu1', '11111111-2222-3333-4444-555555555555'].join('-');

test('connector settings only accept their own service', () => {
  assert.equal(connectorInput.safeParse({ kind: 'slack', events: ['qr.scanned'], webhookUrl: 'https://hooks.slack.com/services/T0/B0/abcdefghij' }).success, true);
  assert.equal(connectorInput.safeParse({ kind: 'slack', events: ['qr.scanned'], webhookUrl: 'https://hooks.slack.com.evil.test/services/T0/B0/abcdefghij' }).success, false);
  assert.equal(connectorInput.safeParse({ kind: 'slack', events: ['qr.scanned'], webhookUrl: 'http://hooks.slack.com/services/T0/B0/abcdefghij' }).success, false);
  assert.equal(connectorInput.safeParse({ kind: 'hubspot', events: ['card.contact'], token: fakeToken }).success, true);
  assert.equal(connectorInput.safeParse({ kind: 'hubspot', events: ['form.submitted'], token: fakeToken }).success, false, 'forms have no CRM consent');
  assert.equal(connectorInput.safeParse({ kind: 'ga4', events: ['qr.scanned'], measurementId: 'G-ABC1234', apiSecret: 'abcdefgh' }).success, true);
  assert.equal(connectorInput.safeParse({ kind: 'ga4', events: ['card.contact'], measurementId: 'G-ABC1234', apiSecret: 'abcdefgh' }).success, false);
  assert.equal(connectorInput.safeParse({ kind: 'ga4', events: ['qr.scanned'], measurementId: 'G-ABC1234', apiSecret: 'abcdefgh', extra: 1 }).success, false);
});

test('connector payloads', () => {
  assert.equal(slackText('card.contact', { name: '<!channel> Ana\n• Pay at https://x', email: 'a@b.co' }), 'New contact from a card: &lt;!channel&gt; Ana • Pay at https://x · a@b.co', 'one line, no mentions');
  assert.match(slackText('form.submitted', { title: 'RSVP', answers: [{ label: 'Guests', value: 2 }, { label: 'Days', value: ['Mon', 'Tue'] }] }), /• Guests: 2\n• Days: Mon, Tue$/);
  assert.equal(hubspotContact({ name: 'Ana', phone: '1' }), null);
  assert.deepEqual(hubspotContact({ name: 'سارة حداد', email: 'S@X.CO' }).properties, { email: 's@x.co', firstname: 'سارة', lastname: 'حداد' });
  assert.deepEqual(hubspotContact({ name: 'Ana', email: 'a@b.co', phone: '', company: null }).properties, { email: 'a@b.co', firstname: 'Ana' }, 'empty values never clear CRM fields');
  const event = ga4Event({ qr_code_id: 'q', short_code: 's', title: 'T', device_type: 'mobile', country: 'BR' }, 'c-1');
  assert.equal(event.client_id, 'c-1');
  assert.equal(event.events[0].params.country, undefined, 'no visitor location goes to GA4');
});
