// Lot 17 browser verification against a local production build with a disposable database.
// The server must run with WEBHOOK_ALLOW_LOOPBACK=true INTEGRATION_TEST_ORIGIN=http://127.0.0.1:3297 so connectors reach the local receiver below.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/17-integracoes/verificacao/e2e.mjs http://localhost:3197 docs/evidence/lote-17
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, out] = process.argv.slice(2);
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
const waitFor = async predicate => { for (let index = 0; index < 50 && !predicate(); index++) await new Promise(resolve => setTimeout(resolve, 100)); return predicate(); };

// Dummy token, assembled so secret scanners do not mistake it for a real one.
const fakeToken = ['pat', 'na1', '11111111-2222-3333-4444-555555555555'].join('-');
const received = [];
const receiver = createServer((req, res) => { let body = ''; req.on('data', chunk => { body += chunk; }); req.on('end', () => { received.push({ method: req.method, url: req.url, headers: req.headers, body }); res.end('{}'); }); });
await new Promise(resolve => receiver.listen(3297, '127.0.0.1', resolve));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 17', email: `lot17-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
page.on('dialog', dialog => void dialog.accept());
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled', fullPage: true });

await page.goto(base + '/integrations');
check('integrations page opens from the sidebar', await visible(page.getByRole('heading', { name: 'Integrations', level: 1 })) && await visible(page.getByRole('link', { name: 'Integrations' })));
check('QR catalog lists Slack, GA4 and automation', await visible(page.getByRole('heading', { name: 'Google Analytics 4' })) && await visible(page.getByRole('heading', { name: 'Zapier, Make and n8n' }))
  && !(await page.getByRole('heading', { name: 'HubSpot CRM' }).count()));
await shot('01-catalogo-qr');

const slackCard = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Slack' }) });
await slackCard.getByRole('button', { name: 'Connect' }).click();
await slackCard.getByLabel('Slack incoming webhook address').fill('https://example.com/services/x');
await slackCard.getByRole('button', { name: 'Save connection' }).click();
check('foreign Slack address is refused', await visible(page.getByRole('alert').filter({ hasText: 'Paste the Slack incoming webhook address' })));
await slackCard.getByLabel('Slack incoming webhook address').fill('https://hooks.slack.com/services/T000E2E/B000E2E/e2etestsecretvalue');
await slackCard.getByLabel('Name (optional)').fill('Canal de vendas');
await slackCard.getByRole('button', { name: 'Save connection' }).click();
check('Slack is connected', await visible(page.getByText('Integration connected.')) && await visible(page.getByText('Canal de vendas')));
check('only a hint of the credential is shown', await visible(page.getByText('…alue')) && !(await page.content()).includes('e2etestsecretvalue'));

await page.getByRole('tab', { name: 'Cards' }).click();
const hubspotCard = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'HubSpot CRM' }) });
check('Cards catalog lists HubSpot', await visible(hubspotCard));
await hubspotCard.getByRole('button', { name: 'Connect' }).click();
await hubspotCard.getByLabel('HubSpot private app token').fill(fakeToken);
await hubspotCard.getByRole('button', { name: 'Save connection' }).click();
check('HubSpot is connected', await visible(page.getByText('HubSpot', { exact: true })));

const hubspotRow = page.getByRole('listitem').filter({ hasText: '…5555' });
await hubspotRow.getByRole('button', { name: 'Test connection' }).click();
check('HubSpot test only reads contacts', await waitFor(() => received.some(item => item.method === 'GET' && item.url === '/crm/v3/objects/contacts?limit=1'))
  && received.find(item => item.method === 'GET').headers.authorization === `Bearer ${fakeToken}`);
check('delivery history shows the test', await visible(hubspotRow.getByRole('cell', { name: 'delivered' })));

const qr = (await (await context.request.post(base + '/api/qr-codes', { headers: { origin: base }, data: { title: 'Vitrine', destination_url: 'https://example.test/v' } })).json()).qrCode;
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1' });
await phone.request.get(`${base}/qr?code=${qr.short_code}`, { maxRedirects: 0 });
check('a scan reaches Slack', await waitFor(() => received.some(item => item.url.startsWith('/services/T000E2E') && JSON.parse(item.body).text.includes('Vitrine'))));
await page.reload();
check('status shows the connection working', await visible(page.getByRole('listitem').filter({ hasText: 'Canal de vendas' }).getByText(/Working/)));
await shot('02-conectados');

await hubspotRow.getByRole('button', { name: /Disconnect/ }).click();
check('HubSpot is disconnected', await visible(page.getByText('Integration disconnected.')) && await page.getByText('…5555').waitFor({ state: 'detached', timeout: 10000 }).then(() => true, () => false));

await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/integrations');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic integrations page', await visible(page.getByRole('heading', { name: 'التكاملات', level: 1 })));
await shot('03-arabe');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
await new Promise(resolve => receiver.close(resolve));
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
