// Lot 9 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/09-biblioteca-de-arquivos/verificacao/e2e.mjs http://localhost:3189 docs/evidence/lote-09
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import jsQR from 'jsqr';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, out] = process.argv.slice(2);
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);

// Synthetic files: a 64×64 red square PNG, a PDF and a disguised SVG.
const fixtures = path.join(tmpdir(), `qrconnect-lot9-${randomUUID()}`);
mkdirSync(fixtures);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const maker = await browser.newPage();
const pngBase64 = await maker.evaluate(() => {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const context = canvas.getContext('2d'); context.fillStyle = '#d00'; context.fillRect(0, 0, 64, 64);
  context.fillStyle = '#fff'; context.fillRect(16, 16, 32, 32);
  return canvas.toDataURL('image/png').split(',')[1];
});
await maker.close();
writeFileSync(path.join(fixtures, 'marca.png'), Buffer.from(pngBase64, 'base64'));
writeFileSync(path.join(fixtures, 'cardapio.pdf'), '%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n');
writeFileSync(path.join(fixtures, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
const signUp = await context.request.post(base + '/api/auth/sign-up/email', {
  headers: { origin: base }, data: { name: 'Lot 9 validation', email: `lot9-${randomUUID()}@example.test`, password: randomUUID() + '+' },
});
if (!signUp.ok()) throw new Error('could not create disposable account');
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });

await page.goto(base + '/overview');
await page.getByRole('link', { name: 'Asset library' }).click();
await page.waitForURL(/\/assets$/);
check('sidebar opens the asset library', await visible(page.getByText('Your library is empty.')));
await shot('01-biblioteca-vazia');

await page.locator('input[type=file][multiple]').setInputFiles([path.join(fixtures, 'marca.png'), path.join(fixtures, 'cardapio.pdf'), path.join(fixtures, 'logo.svg')]);
check('mixed upload reports the rejected SVG', await visible(page.getByRole('alert').filter({ hasText: 'logo.svg: Only PNG, JPEG, WebP, GIF and PDF files are accepted' })));
check('accepted files appear with details', await visible(page.getByRole('heading', { name: 'marca.png' })) && await visible(page.getByText('64×64')));
check('storage meter counts the files', await visible(page.getByText('2 of 500 files')));

await page.getByLabel('New folder name').fill('Logos');
await page.getByRole('button', { name: 'Create folder' }).click();
check('folder is created', await visible(page.getByRole('navigation', { name: 'Folders' }).getByRole('link', { name: /Logos/ })));
await page.getByLabel('Folder for marca.png').selectOption({ label: 'Logos' });
await page.getByRole('navigation', { name: 'Folders' }).getByRole('link', { name: /Logos/ }).click();
await page.waitForURL(/folder=/);
check('folder shows only its files', await visible(page.getByRole('heading', { name: 'marca.png' })) && !(await page.getByRole('heading', { name: 'cardapio.pdf' }).count()));
await page.getByRole('button', { name: 'Rename marca.png' }).click();
await page.getByLabel('File name').fill('Marca oficial');
await page.getByRole('button', { name: 'Save' }).click();
check('file is renamed', await visible(page.getByRole('heading', { name: 'Marca oficial' })));
await shot('02-pasta-logos');

await page.goto(base + '/assets?kind=document');
check('type filter shows the PDF only', await visible(page.getByRole('heading', { name: 'cardapio.pdf' })) && !(await page.getByRole('heading', { name: 'Marca oficial' }).count()));
await page.goto(base + '/assets');
await page.getByLabel('Search files').fill('oficial');
await page.getByRole('button', { name: 'Search', exact: true }).click();
await page.waitForURL(/q=oficial/);
check('search finds the renamed file', await visible(page.getByText('1 file')));

// Reuse in the QR editor: library logo, preview, download and decode.
await page.goto(base + '/app');
await page.getByRole('radiogroup', { name: 'QR code type' }).waitFor();
await page.locator('[data-qr-type="website"]').click();
await page.getByRole('button', { name: 'Next', exact: true }).click();
await page.getByLabel(/Destination URL/).fill('https://example.test/library-logo');
await page.getByLabel('QR name (optional)').fill('Library logo QR');
await page.getByRole('button', { name: /Next: design/ }).click();
await page.getByRole('button', { name: /Create QR code/ }).waitFor();
await page.locator('button[aria-pressed]').nth(0).click();
await page.getByRole('button', { name: 'Logo' }).click();
const libraryButton = page.getByRole('button', { name: 'Marca oficial' });
check('editor lists library images', await visible(libraryButton));
await libraryButton.click();
check('library logo is selected', await libraryButton.getAttribute('aria-pressed') === 'true');
const previewImage = page.locator('svg[role=img] image').first();
check('preview embeds the library logo', await visible(previewImage) && (await previewImage.getAttribute('href'))?.startsWith('data:image/png'));
await shot('03-editor-logo-da-biblioteca');
await page.getByRole('button', { name: /Create QR code/ }).click();
check('QR with library logo is saved', await visible(page.getByRole('heading', { name: 'Your QR code is ready' })));
const saved = await (await context.request.get(base + '/api/qr-codes?page=1')).json();
const qr = saved.qrCodes.find(item => item.design?.logoAssetId);
check('saved design references the library file', Boolean(qr));
const svgMarkup = await page.locator('svg[role=img]').first().evaluate(node => node.outerHTML);
check('exported SVG would carry the logo inline', svgMarkup.includes('data:image/png'));
const decode = await page.evaluate(async markup => {
  const blob = new Blob([markup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const image = new Image(); image.src = url; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600 * image.height / image.width;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: data.width, height: data.height, pixels: Array.from(data.data) };
}, svgMarkup);
const result = jsQR(Uint8ClampedArray.from(decode.pixels), decode.width, decode.height);
check('QR with library logo still decodes', result?.data?.includes('/qr?code=') || result?.data === 'https://example.test/library-logo', result?.data ?? 'no data');

// Removal warns about the QR that uses the file and clears its logo.
await page.goto(base + '/assets');
check('library shows the QR usage', await visible(page.getByText('Used by 1 QR code')));
page.once('dialog', dialog => { check('delete asks with the usage warning', dialog.message().includes('1 QR code uses it as a logo')); void dialog.accept(); });
await page.getByRole('button', { name: 'Delete Marca oficial' }).click();
check('deleted file leaves the library', await page.getByRole('heading', { name: 'Marca oficial' }).waitFor({ state: 'detached', timeout: 8000 }).then(() => true, () => false));
const after = await (await context.request.get(base + `/api/qr-codes/${qr.id}`)).json();
check('QR no longer references the deleted file', !after.qrCode.design.logoAssetId);

// Another account sees nothing and cannot read the PDF.
const pdfId = (await (await context.request.get(base + '/api/assets')).json()).items[0].id;
const stranger = await browser.newContext();
await stranger.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Other', email: `lot9-other-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
check('another account cannot read the file', (await stranger.request.get(base + `/api/assets/${pdfId}/file`)).status() === 404);
const strangerPage = await stranger.newPage();
await strangerPage.goto(base + '/assets');
check('another account sees an empty library', await visible(strangerPage.getByText('Your library is empty.')));

// Mobile and Arabic.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: await context.storageState() });
const mobile = await phone.newPage();
mobile.on('pageerror', error => errors.push(mobile.url() + ' ' + String(error).slice(0, 80)));
await mobile.goto(base + '/');
await mobile.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await mobile.goto(base + '/assets');
await mobile.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic library heading', await visible(mobile.getByRole('heading', { name: 'مكتبة الملفات' })));
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('library fits the phone without horizontal scroll', overflow <= 1, `overflow ${overflow}px`);
await mobile.screenshot({ path: `${out}/04-biblioteca-arabe-celular.png`, fullPage: true });

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
