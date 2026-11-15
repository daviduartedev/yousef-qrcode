import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundCoordinate, scheduleOpen, scheduleSchema, validAlias, zonedParts } from '../src/lib/qr-rules.ts';
import { normalizeHostname, txtMatches, verificationValue } from '../src/lib/domains.ts';

const schedule = (extra) => scheduleSchema.parse({ timezone: 'UTC', startsAt: null, endsAt: null, days: [], from: null, to: null, ...extra });

test('schedules use the chosen time zone for dates, days and daily windows', () => {
  // 2026-11-15T23:30Z is Sunday 23:30 in UTC but already Monday 02:30 in Riyadh (UTC+3).
  const instant = new Date('2026-11-15T23:30:00Z');
  assert.deepEqual(zonedParts(instant, 'Asia/Riyadh'), { local: '2026-11-16T02:30', weekday: 1, time: '02:30' });
  assert.equal(scheduleOpen(schedule({ timezone: 'Asia/Riyadh', days: [1] }), instant).open, true);
  assert.equal(scheduleOpen(schedule({ timezone: 'UTC', days: [1] }), instant).reason, 'closed');
  assert.equal(scheduleOpen(schedule({ startsAt: '2026-11-16T00:00' }), instant).reason, 'not-started');
  assert.equal(scheduleOpen(schedule({ timezone: 'Asia/Riyadh', startsAt: '2026-11-16T00:00' }), instant).open, true);
  assert.equal(scheduleOpen(schedule({ endsAt: '2026-11-15T23:30' }), instant).reason, 'ended', 'the end is exclusive');
  assert.equal(scheduleOpen(schedule({ from: '22:00', to: '02:00' }), instant).open, true, 'windows may cross midnight');
  assert.equal(scheduleOpen(schedule({ from: '09:00', to: '17:00' }), instant).reason, 'closed');
  assert.equal(scheduleOpen(schedule({ timezone: 'America/Sao_Paulo', from: '20:00', to: '21:00' }), instant).open, true, 'Sao Paulo is 20:30');
});

test('invalid schedules are refused', () => {
  assert.equal(scheduleSchema.safeParse({ timezone: 'Mars/Base', startsAt: null, endsAt: null, days: [], from: null, to: null }).success, false);
  assert.equal(scheduleSchema.safeParse({ timezone: 'UTC', startsAt: '2026-12-02T00:00', endsAt: '2026-12-01T00:00', days: [], from: null, to: null }).success, false);
  assert.equal(scheduleSchema.safeParse({ timezone: 'UTC', startsAt: null, endsAt: null, days: [], from: '09:00', to: null }).success, false);
  assert.equal(scheduleSchema.safeParse({ timezone: 'UTC', startsAt: null, endsAt: null, days: [1, 1], from: null, to: null }).success, false);
});

test('aliases, coordinates and custom domains are validated', () => {
  assert.ok(validAlias('menu-lisboa'));
  for (const bad of ['ab', 'Menu', 'menu--x', '-menu', 'api', 'a'.repeat(33), 'menu_x']) assert.equal(validAlias(bad), false, bad);
  assert.deepEqual([roundCoordinate(38.722252), roundCoordinate(-9.139337)], [38.72, -9.14]);
  assert.equal(normalizeHostname('HTTPS://QR.Example.com/path', 'app.example'), 'qr.example.com');
  assert.equal(normalizeHostname('qr.example.com.', 'app.example'), 'qr.example.com');
  for (const bad of ['localhost', 'yousef-xi.vercel.app', 'app.example', 'bad_host.com', 'x', 'shop.test', '-a.com']) assert.equal(normalizeHostname(bad, 'app.example'), null, bad);
  assert.ok(txtMatches([['other'], ['qrconnect-verify=', 'abc']], 'abc'), 'chunks are joined');
  assert.equal(txtMatches([['qrconnect-verify=abd']], 'abc'), false);
  assert.equal(verificationValue('abc'), 'qrconnect-verify=abc');
});
