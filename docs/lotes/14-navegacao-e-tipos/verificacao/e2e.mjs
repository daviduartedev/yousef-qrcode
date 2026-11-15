// Lot 14 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/14-navegacao-e-tipos/verificacao/e2e.mjs http://localhost:3194 docs/evidence/lote-14
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
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 14', email: `lot14-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const api = (path, data, method = 'POST') => context.request.fetch(base + path, { method, headers: { origin: base }, data });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });

// A published Linkpage to link from the wizard.
const linkpage = (await (await api('/api/linkpages', { template: 'business', creation_key: randomUUID() })).json()).linkpage;
await api(`/api/linkpages/${linkpage.id}/publish`, { publish: true });

await page.goto(base + '/app');
await page.getByRole('radiogroup', { name: 'QR code type' }).waitFor();
check('wizard offers the linked types', await page.locator('[data-qr-type="linkpage"]').count() === 1 && await page.locator('[data-qr-type="file"]').count() === 1
  && !(await page.locator('[data-qr-type="contactCard"]').count()));
await shot('01-tipos-vinculados');
await page.locator('[data-qr-type="linkpage"]').click();
await page.getByRole('button', { name: 'Next', exact: true }).click();
await page.getByRole('button', { name: /Next: design/ }).click();
check('a linked type needs an item', await visible(page.getByRole('alert').filter({ hasText: 'Choose what the QR code opens' })));
await page.getByRole('radio', { name: new RegExp(linkpage.title) }).check();
await shot('02-escolher-linkpage');
await page.getByRole('button', { name: /Next: design/ }).click();
await page.getByRole('button', { name: /Create QR code/ }).waitFor();

// Saved template: save the current design, then apply it later.
await page.getByLabel('Template name').fill('Marca azul');
await page.getByRole('button', { name: 'Save current design' }).click();
check('design saved as a template', await visible(page.getByText('Design saved to your templates.')) && await visible(page.getByRole('button', { name: 'Apply Marca azul' })));
await page.getByRole('button', { name: /Create QR code/ }).click();
check('linked QR is created', await visible(page.getByRole('heading', { name: 'Your QR code is ready' })));
const created = (await (await context.request.get(base + '/api/qr-codes?page=1')).json()).qrCodes[0];
check('linked QR opens the page address', created.qr_type === 'linkpage' && created.destination_url === `${base}/p/${linkpage.slug}`, created.destination_url);
await page.goto(base + `/app?edit=${created.id}`);
check('reopened linked QR explains it follows the page', await visible(page.getByText(/This QR code follows its Linkpage/)));
await shot('03-qr-vinculado-detalhe');

// Find by image: a PNG of the created code is decoded in the browser.
const png = await page.evaluate(async () => {
  const svg = [...document.querySelectorAll('svg[role=img]')].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const image = new Image(); image.src = URL.createObjectURL(blob); await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600 * image.height / image.width;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').split(',')[1];
});
await api('/api/qr-codes', { title: 'Other code', destination_url: 'https://example.test/other' });
await page.goto(base + '/my-qrcodes');
await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
await page.waitForURL(/focus=/, { timeout: 10000 }).catch(() => {});
check('find by image opens the matching code', new URL(page.url()).searchParams.get('focus') === created.id, page.url() + ' ' + (await page.getByRole('status').allInnerTexts()).join(' | '));
await shot('04-busca-por-imagem');

await page.goto(base + '/my-qrcodes');
await page.getByRole('link', { name: 'Created by me' }).click();
await page.waitForURL(/creator=me/);
check('created-by-me filter is applied', await visible(page.getByText('Other code')) && await visible(page.getByRole('link', { name: 'Created by me' })));

// Arabic type step.
await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/app');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic linked types', await visible(page.getByText('صفحة روابط')) && await visible(page.getByText('PDF أو صورة')));
await shot('05-tipos-arabe');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
