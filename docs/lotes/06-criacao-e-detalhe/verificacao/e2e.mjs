// Lot 6 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] //   node docs/lotes/06-criacao-e-detalhe/verificacao/e2e.mjs http://localhost:3186 docs/evidence/lote-06
import { mkdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import jsQR from 'jsqr';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.argv[2];
const out = process.argv[3];
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local server only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const signUp = async (context) => {
  const response = await context.request.post(base + '/api/auth/sign-up/email', {
    headers: { origin: base },
    data: { name: 'Lot 6 validation', email: `lot6-${randomUUID()}@example.test`, password: randomUUID() + '+' },
  });
  if (!response.ok()) throw new Error('could not create disposable account');
};
const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await signUp(desktop);
const page = await desktop.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled', fullPage: false });

async function decodeDownload(download, keep) {
  const bytes = readFileSync(await download.path());
  if (keep) (await import('node:fs')).writeFileSync(`${out}/${keep}.png`, bytes);
  const pixels = await page.evaluate(async (b64) => {
    const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let binary = '';
    for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
    return { width: bitmap.width, height: bitmap.height, rgba: btoa(binary) };
  }, bytes.toString('base64'));
  const rgba = new Uint8ClampedArray(Buffer.from(pixels.rgba, 'base64'));
  const result = jsQR(rgba, pixels.width, pixels.height);
  return { width: pixels.width, text: result && new TextDecoder().decode(new Uint8Array(result.binaryData)) };
}
async function downloadFrom(dialogTrigger, { format = 'PNG', size, level } = {}) {
  await dialogTrigger.click();
  const dialog = page.getByRole('dialog', { name: /Download QR|تنزيل QR/ });
  await dialog.waitFor();
  await dialog.getByLabel(format, { exact: true }).check();
  if (size) await dialog.getByLabel(/^Size$|^الحجم$/).selectOption(String(size));
  if (level) await dialog.getByLabel(/Error correction|تصحيح الأخطاء/).selectOption(level);
  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /^(Download|تنزيل)$/ }).click();
  return pending;
}

// 1. Dynamic website through every step.
await page.goto(base + '/app');
await page.getByRole('radiogroup', { name: 'QR code type' }).waitFor();
check('wizard opens on the type step', await page.getByRole('button', { name: /Type/ }).getAttribute('aria-current') === 'step');
await shot('01-tipo-desktop');
await page.locator('[data-qr-type="website"]').click();
await page.getByRole('button', { name: 'Next', exact: true }).click();
await page.getByRole('button', { name: /Next: design/ }).click();
check('content step blocks an empty URL', await page.getByText('Enter a valid HTTP/HTTPS URL.').first().isVisible());
await page.getByLabel(/Destination URL/).fill('https://example.test/launch');
await page.getByLabel('QR name (optional)').fill('Launch campaign');
await shot('02-conteudo-website');
await page.getByRole('button', { name: /Next: design/ }).click();
await page.getByRole('button', { name: /Create QR code/ }).waitFor();
await page.locator('button[aria-pressed]').nth(2).click();
await shot('03-design-website');
// jsQR cannot read round dot modules; decode checks use Classic, styled scans stay in the human checklist.
await page.locator('button[aria-pressed]').nth(0).click();
await page.getByRole('button', { name: /Create QR code/ }).click();
await page.getByRole('heading', { name: 'Your QR code is ready' }).waitFor();
await page.waitForURL(/[?&]edit=/);
const editUrl = new URL(page.url());
const websiteId = editUrl.searchParams.get('edit');
const trackingUrl = (await page.locator('dd bdi.font-mono').textContent()).trim();
check('done step shows the tracking URL', /\/qr\?code=[A-Za-z0-9_-]{12}$/.test(trackingUrl), trackingUrl);
await shot('04-concluido-website');
let file = await downloadFrom(page.getByRole('button', { name: 'Download QR' }).first(), { size: 512, level: 'H' });
let decoded = await decodeDownload(file, 'download-website-512');
check('PNG 512 px from the done step decodes to the tracking URL', decoded.width === 512 && decoded.text === trackingUrl, `${decoded.width}px ${decoded.text}`);
file = await downloadFrom(page.getByRole('button', { name: 'Download QR' }).first(), { format: 'SVG', size: 2048 });
const svg = readFileSync(await file.path(), 'utf8');
check('SVG download keeps the requested width', /<svg[^>]*width="2048"/.test(svg) && file.suggestedFilename().endsWith('.svg'), file.suggestedFilename());
let scan = await desktop.request.get(trackingUrl, { maxRedirects: 0 });
check('tracking URL redirects to the first destination', scan.status() === 302 && scan.headers().location === 'https://example.test/launch');

// 2. Change the destination from the QR detail and keep the same URL and scans.
await page.goto(base + '/my-qrcodes?focus=' + websiteId);
await page.getByRole('button', { name: 'QR details' }).first().click();
const destination = page.getByLabel('New destination URL');
await destination.fill('https://example.test/launch-v2?ref=qr');
await page.getByRole('button', { name: 'Change destination' }).click();
await page.getByText('Destination updated. The printed code now opens the new address.').waitFor();
await page.getByText('Destination history').click();
await page.getByText('https://example.test/launch-v2?ref=qr', { exact: true }).last().waitFor();
await shot('05-detalhe-troca-destino');
scan = await desktop.request.get(trackingUrl, { maxRedirects: 0 });
check('same tracking URL now redirects to the new destination', scan.headers().location === 'https://example.test/launch-v2?ref=qr');
const recordResponse = await desktop.request.get(base + '/api/qr-codes/' + websiteId);
const record = await recordResponse.json();
if (!record.qrCode) console.log('record response', recordResponse.status(), JSON.stringify(record), websiteId);
check('scans are preserved across the change', record.qrCode.total_scans === 2, String(record.qrCode.total_scans));

// 3. Static Wi-Fi with validation, masking and decoding.
await page.goto(base + '/app');
await page.locator('[data-qr-type="wifi"]').click();
await page.getByRole('button', { name: 'Next', exact: true }).click();
await page.getByLabel(/Network name/).fill('Office;5G');
await page.getByRole('button', { name: /Next: design/ }).click();
check('Wi-Fi requires a password for WPA', await page.getByText('Enter the network password: 8 to 63 characters for WPA.').isVisible());
await page.getByLabel(/^Password/).fill('lot6:secret');
await page.getByRole('button', { name: /Next: design/ }).click();
await page.getByRole('button', { name: 'Logo' }).click().catch(() => {});
await page.getByRole('button', { name: /Create QR code/ }).click();
await page.getByRole('heading', { name: 'Your QR code is ready' }).waitFor();
await page.waitForURL(/[?&]edit=/);
const wifiId = new URL(page.url()).searchParams.get('edit');
file = await downloadFrom(page.getByRole('button', { name: 'Download QR' }).first(), { size: 1024, level: 'Q' });
decoded = await decodeDownload(file);
check('Wi-Fi PNG decodes to the escaped WIFI payload', decoded.text === 'WIFI:T:WPA;S:Office\\;5G;P:lot6\\:secret;;', decoded.text);
await page.goto(base + '/my-qrcodes');
const listText = await page.locator('main').innerText();
check('list shows the SSID and hides the Wi-Fi password', listText.includes('Wi-Fi · Office;5G') && !listText.includes('lot6:secret'));
await shot('06-lista-wifi-mascarado');

// 4. Reopen a static QR: content is read-only, design remains editable.
await page.goto(base + '/app?edit=' + wifiId);
await page.getByText('Static content is stored in the pattern. Create a new QR to change it.').waitFor();
check('reopened static content is read-only', await page.getByLabel(/Network name/).getAttribute('readonly') !== null);
await shot('07-reabrir-estatico');

// 5. Leaving with unsaved content asks for confirmation.
await page.goto(base + '/app');
await page.locator('[data-qr-type="text"]').click();
await page.getByRole('button', { name: 'Next', exact: true }).click();
await page.getByLabel(/^Text/).fill('Unsaved draft');
let prompted = false;
page.once('dialog', dialog => { prompted = true; dialog.dismiss(); });
await page.getByRole('link', { name: 'Direct QR Codes' }).first().click();
await page.waitForTimeout(300);
check('leaving a dirty draft asks for confirmation and stays', prompted && new URL(page.url()).pathname === '/app');

// 6. Arabic / RTL, Arabic text payload.
page.once('dialog', dialog => dialog.accept());
await page.getByRole('button', { name: 'Change language' }).click();
await page.getByRole('menuitem', { name: /العربية/ }).click();
await page.goto(base + '/app');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic wizard renders RTL with translated steps', await page.getByRole('radiogroup', { name: 'نوع رمز QR' }).isVisible());
await shot('08-tipo-arabe-rtl');
await page.locator('[data-qr-type="text"]').click();
await page.getByRole('button', { name: 'التالي', exact: true }).click();
await page.getByLabel(/^نص/).fill('مرحبا بكم في كيو آر كونكت');
await page.getByRole('button', { name: /التالي: التصميم/ }).click();
await page.getByRole('button', { name: /إنشاء رمز QR/ }).click();
await page.getByRole('heading', { name: 'رمز QR الخاص بك جاهز' }).waitFor();
await page.waitForURL(/[?&]edit=/);
await shot('09-concluido-arabe');
file = await downloadFrom(page.getByRole('button', { name: 'تنزيل QR' }).first(), { size: 1024, level: 'L' });
decoded = await decodeDownload(file);
check('Arabic text PNG decodes to the same UTF-8 text', decoded.text === 'مرحبا بكم في كيو آر كونكت', decoded.text);

// 7. Mobile layout of the type and content steps.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await signUp(mobile);
const phone = await mobile.newPage();
await phone.goto(base + '/app');
await phone.getByRole('radiogroup', { name: 'QR code type' }).waitFor();
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile type step has no horizontal overflow', overflow <= 1, `${overflow}px`);
await phone.screenshot({ path: `${out}/10-tipo-celular.png` });
await phone.locator('[data-qr-type="email"]').click();
await phone.getByRole('button', { name: 'Next', exact: true }).click();
await phone.getByLabel(/Recipient email/).fill('team@example.test');
await phone.screenshot({ path: `${out}/11-conteudo-email-celular.png` });

// 8. Isolation: a second account cannot read, change or list history of the first account's QR.
const strangerRequest = mobile.request;
check('another account cannot read the QR', (await strangerRequest.get(base + '/api/qr-codes/' + websiteId)).status() === 404);
check('another account cannot change the destination', (await strangerRequest.patch(base + '/api/qr-codes/' + websiteId, {
  headers: { origin: base }, data: { destination_url: 'https://example.test/hijack' } })).status() === 404);
check('another account cannot read the history', (await strangerRequest.get(base + '/api/qr-codes/' + websiteId + '/destinations')).status() === 404);
scan = await desktop.request.get(trackingUrl, { maxRedirects: 0 });
check('destination is unchanged after the refused attempts', scan.headers().location === 'https://example.test/launch-v2?ref=qr');

check('no uncaught page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(result => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length ? 1 : 0;
