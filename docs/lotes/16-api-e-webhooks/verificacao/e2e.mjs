// Lot 16 browser verification against a local production build with a disposable database.
// The server must run with WEBHOOK_ALLOW_LOOPBACK=true so it can deliver to the local receiver below.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/16-api-e-webhooks/verificacao/e2e.mjs http://localhost:3196 docs/evidence/lote-16
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, out] = process.argv.slice(2);
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
const waitFor = async predicate => { for (let index = 0; index < 50 && !predicate(); index++) await new Promise(resolve => setTimeout(resolve, 100)); return predicate(); };

const received = [];
const receiver = createServer((req, res) => { let body = ''; req.on('data', chunk => { body += chunk; }); req.on('end', () => { received.push({ headers: req.headers, body }); res.end('ok'); }); });
await new Promise(resolve => receiver.listen(0, '127.0.0.1', resolve));
const hookUrl = `http://127.0.0.1:${receiver.address().port}/hook`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 16', email: `lot16-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
page.on('dialog', dialog => void dialog.accept());
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled', fullPage: true, mask: [page.getByRole('status').locator('code')] });
await context.request.post(base + '/api/qr-codes', { headers: { origin: base }, data: { title: 'Cardápio', destination_url: 'https://example.test/menu' } });

await page.goto(base + '/settings/developers');
check('developers page opens from the sidebar', await visible(page.getByRole('heading', { name: 'API and webhooks' })) && await visible(page.getByRole('link', { name: 'API and webhooks' })));
await page.getByLabel('Key name').fill('Integração');
await page.getByRole('button', { name: 'Create key' }).click();
const secretBox = page.getByRole('status').filter({ hasText: 'copy it now' });
check('new key is shown once', await visible(secretBox));
const key = (await secretBox.locator('code').innerText()).trim();
check('key has the documented format', /^qrc_[a-z0-9]{12}_[A-Za-z0-9_-]{43}$/.test(key));
await shot('01-chave-criada');

const api = await browser.newContext();
const listed = await api.request.get(base + '/api/v1/qr-codes', { headers: { authorization: `Bearer ${key}` } });
check('key lists the workspace QR codes', listed.status() === 200 && (await listed.json()).data.some(item => item.title === 'Cardápio'));
const denied = await api.request.post(base + '/api/v1/qr-codes', { headers: { authorization: `Bearer ${key}` }, data: { title: 'x', destination_url: 'https://example.test/' } });
check('read-only key cannot create', denied.status() === 403);

await page.reload();
check('secret is gone after reload', !(await page.content()).includes(key.split('_')[2]));
await page.getByRole('button', { name: 'Revoke' }).click();
check('key is revoked', await visible(page.getByText('API key revoked.')) && await visible(page.getByText('Revoked')));
check('revoked key stops working', (await api.request.get(base + '/api/v1/qr-codes', { headers: { authorization: `Bearer ${key}` } })).status() === 401);

await page.getByLabel('Receiver address').fill('https://192.168.0.10/hook');
await page.getByRole('button', { name: 'Create webhook' }).click();
check('private address is refused', await visible(page.getByRole('alert').filter({ hasText: 'Webhooks cannot reach private network addresses' })));
await page.getByLabel('Receiver address').fill(hookUrl);
await page.getByRole('button', { name: 'Create webhook' }).click();
const hookSecretBox = page.getByRole('status').filter({ hasText: 'copy it now' });
check('webhook is created with a signing secret', await visible(hookSecretBox));
const secret = (await hookSecretBox.locator('code').innerText()).trim();
await page.getByRole('button', { name: 'Send test event' }).click();
check('test event arrives', await waitFor(() => received.length > 0));
const first = received[0];
const match = String(first?.headers['qrconnect-signature'] ?? '').match(/^t=(\d+),v1=([0-9a-f]{64})$/);
check('test event is signed with the shown secret', match && match[2] === createHmac('sha256', secret).update(`${match[1]}.${first.body}`).digest('hex'));
check('deliveries table lists the test event', await visible(page.getByRole('cell', { name: 'delivered' })));
await shot('02-webhook-entregas');

await page.getByRole('button', { name: 'Send again' }).first().click();
check('delivery can be sent again', await visible(page.getByText('Delivery sent again.')) && await waitFor(() => received.length > 1)
  && JSON.parse(received[1].body).id === JSON.parse(received[0].body).id);

await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/settings/developers');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic developers page', await visible(page.getByRole('heading', { name: 'الواجهة البرمجية وخطافات الويب' })));
await shot('03-arabe');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
await new Promise(resolve => receiver.close(resolve));
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
