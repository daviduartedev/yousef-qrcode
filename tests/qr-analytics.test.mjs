import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, isBotUserAgent, lifecycleOf, readAnalyticsQuery } from '../src/lib/qr-analytics.ts';

test('bot detection excludes previews and scripts but keeps people and in-app browsers', () => {
  const bots = [
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'WhatsApp/2.23.20.0 A',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'TelegramBot (like TwitterBot)',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0)',
    'Discordbot/2.0',
    'curl/8.4.0',
    'python-requests/2.31.0',
  ];
  const people = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]',
    'Mozilla/5.0 (Linux; Android 13; Cubot Note 30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Mobile Safari/537.36 Telegram-Android/10.2.0',
    'node',
    '',
  ];
  for (const agent of bots) assert.equal(isBotUserAgent(agent), true, agent);
  for (const agent of people) assert.equal(isBotUserAgent(agent), false, agent);
});

test('lifecycle follows the documented priority and thresholds', () => {
  const base = { active: true, ageDays: 40, scansQuiet: 3, scansRecent: 3, scansEarlier: 0 };
  assert.equal(lifecycleOf({ ...base, active: false, ageDays: 1 }), 'paused');
  assert.equal(lifecycleOf({ ...base, ageDays: 6.9, scansQuiet: 0 }), 'new');
  assert.equal(lifecycleOf({ ...base, scansQuiet: 0, scansRecent: 0 }), 'no_scans');
  assert.equal(lifecycleOf({ ...base, scansRecent: 1, scansEarlier: 4 }), 'declining');
  assert.equal(lifecycleOf({ ...base, scansRecent: 2, scansEarlier: 4 }), 'active');
  assert.equal(lifecycleOf({ ...base, scansRecent: 1, scansEarlier: 3 }), 'active');
});

test('analytics ranges are validated in UTC days with a 30-day fallback', () => {
  const read = (value, today = '2026-11-15') => readAnalyticsQuery(new URLSearchParams(value), today);
  assert.deepEqual(read(''), { from: '2026-10-17', to: '2026-11-15', qr: '', device: '', country: '' });
  assert.equal(read('from=2026-11-01&to=2026-11-10').from, '2026-11-01');
  for (const invalid of ['from=2026-11-10&to=2026-11-01', 'from=2026-02-30&to=2026-03-01', 'from=2026-11-01&to=2026-11-16', 'from=2024-01-01&to=2026-11-15'])
    assert.equal(read(invalid).from, '2026-10-17', invalid);
  const filtered = read('qr=NOT-A-UUID&device=fridge&country=%3Cscript%3E');
  assert.deepEqual([filtered.qr, filtered.device, filtered.country], ['', '', '']);
  assert.equal(read('country=Saudi Arabia&device=mobile').country, 'Saudi Arabia');
});

test('CSV cells are quoted and neutralized against formula execution', () => {
  assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('@sum'), "'@sum");
  assert.equal(csvCell('  =1+1'), "'  =1+1");
  assert.equal(csvCell('＝1+1'), "'＝1+1");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell(12), '12');
  assert.equal(csvCell('حملة'), 'حملة');
});
