// Lot 15 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/15-dominios-e-qr-avancado/verificacao/e2e.mjs http://localhost:3195 docs/evidence/lote-15
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, out] = process.argv.slice(2);
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 15', email: `lot15-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled', fullPage: true });
const qr = (await (await context.request.post(base + '/api/qr-codes', { headers: { origin: base }, data: { title: 'Evento', destination_url: 'https://example.test/evento' } })).json()).qrCode;

await page.goto(`${base}/app?edit=${qr.id}`);
const panel = page.getByRole('region', { name: 'Advanced options' });
check('tracked QR shows advanced options', await visible(panel));
await panel.getByLabel('New password').fill('festa2026');
await panel.getByRole('button', { name: 'Save password' }).click();
check('password is saved', await visible(panel.getByText('Password saved.')) && await visible(panel.getByRole('button', { name: 'Remove password' })));
await panel.getByLabel('Ask visitors to share an approximate location (they can decline)').click();
check('location question is turned on', await visible(panel.getByText('Visitors will be asked for their location.')));
const alias = `evento-${randomUUID().slice(0, 4)}`;
await panel.getByLabel('New alias').fill(alias);
await panel.getByRole('button', { name: 'Add alias' }).click();
check('alias is listed', await visible(panel.getByText(`/r/${alias}`)));
await shot('01-opcoes-avancadas');

// Visitor on a phone: alias → gate → wrong password → right password without sharing location.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const visitor = await phone.newPage();
visitor.on('pageerror', error => errors.push(visitor.url() + ' ' + String(error).slice(0, 80)));
await visitor.goto(`${base}/r/${alias}`);
await visitor.waitForURL(/\/qr\/gate\?code=/);
check('alias leads to the gate', await visible(visitor.getByText('This QR code is protected by a password.')));
await visitor.getByLabel('Password').fill('errada');
await visitor.getByRole('button', { name: 'Open without sharing' }).click();
check('wrong password is refused', await visible(visitor.getByRole('alert').filter({ hasText: 'The password is not correct' })));
await visitor.screenshot({ path: `${out}/02-portao-celular.png` });
await visitor.getByLabel('Password').fill('festa2026');
const outbound = visitor.waitForRequest(request => request.url().startsWith('https://example.test/evento'), { timeout: 10000 }).then(() => true, () => false);
await visitor.getByRole('button', { name: 'Open without sharing' }).click();
check('right password opens the destination', await outbound);

// Schedule that has ended, with and without fallback.
await page.reload();
const reloaded = page.getByRole('region', { name: 'Advanced options' });
await reloaded.getByRole('button', { name: 'Remove password' }).click();
await visible(reloaded.getByText('Password removed.'));
await reloaded.getByLabel('Ask visitors to share an approximate location (they can decline)').click();
await visible(reloaded.getByText('Visitors will not be asked for their location.'));
await reloaded.getByLabel('Open the code only at certain times').check();
await reloaded.getByLabel('Time zone').selectOption('Asia/Riyadh');
await reloaded.getByLabel('Ends').fill('2020-01-01T00:00');
await reloaded.getByRole('button', { name: 'Save schedule' }).click();
check('schedule is saved', await visible(reloaded.getByText('Schedule saved.')));
const closed = await phone.request.get(`${base}/r/${alias}`, { maxRedirects: 0 });
check('ended schedule closes the code', closed.status() === 410 && (await closed.text()).includes('has ended'));
await reloaded.getByLabel('Fallback address outside the schedule (optional)').fill('https://example.test/proximo');
await reloaded.getByRole('button', { name: 'Save schedule' }).click();
await visible(reloaded.getByText('Schedule saved.'));
const fallback = await phone.request.get(`${base}/r/${alias}`, { maxRedirects: 0 });
check('fallback receives people outside the schedule', fallback.headers().location === 'https://example.test/proximo');
await shot('03-agenda');

// Custom domain: instructions and pending verification (no real DNS here).
await page.goto(base + '/settings/domains');
await page.getByLabel('Domain').fill('qr.example.com');
await page.getByRole('button', { name: 'Add domain' }).click();
check('domain shows the TXT record to create', await visible(page.getByText('_qrconnect.qr.example.com')) && await visible(page.getByText(/qrconnect-verify=/)));
await page.getByRole('button', { name: 'Verify' }).click();
check('missing TXT record keeps the domain pending', await visible(page.getByText('The TXT record was not found yet.')) && await visible(page.getByText('Waiting for DNS')));
await shot('04-dominios');

await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/settings/domains');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic domains page', await visible(page.getByRole('heading', { name: 'النطاقات المخصصة' })));

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
