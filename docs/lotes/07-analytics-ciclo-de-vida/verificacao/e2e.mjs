// Lot 7 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/07-analytics-ciclo-de-vida/verificacao/e2e.mjs http://localhost:3187 postgresql://postgres@127.0.0.1:55432/qrconnect_e2e7 docs/evidence/lote-07
import { mkdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, databaseUrl, out] = process.argv.slice(2);
for (const value of [base, databaseUrl]) if (!['localhost', '127.0.0.1'].includes(new URL(value).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
const signUp = await context.request.post(base + '/api/auth/sign-up/email', {
  headers: { origin: base }, data: { name: 'Lot 7 validation', email: `lot7-${randomUUID()}@example.test`, password: randomUUID() + '+' },
});
if (!signUp.ok()) throw new Error('could not create disposable account');
const create = async (title, tracking = true) => (await (await context.request.post(base + '/api/qr-codes', {
  headers: { origin: base }, data: { title, destination_url: 'https://example.test/' + encodeURIComponent(title), tracking_enabled: tracking },
})).json()).qrCode;
const menu = await create('Menu campaign');
const flyer = await create('Flyer campaign');
const fading = await create('Fading poster');
const quiet = await create('Quiet sticker');
await create('Fresh launch');
await create('Printed direct', false);

// Known synthetic scans: Menu 6 in the last 30 days, Flyer 2, Fading 5 older plus 1 recent.
const db = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const old = new Date(Date.now() - 40 * 86400000).toISOString();
for (const qr of [menu, flyer, fading, quiet]) await db.query('UPDATE qrconnect.qr_codes SET created_at = $2 WHERE id = $1', [qr.id, old]);
const insert = (qr, offset, hour, device, country, ip) => db.query(
  `INSERT INTO qrconnect.qr_scans (qr_code_id, scanned_at, device_type, os, browser, country, ip_address, user_agent)
   VALUES ($1, $2, $3, 'Android', 'Chrome', $4, $5, 'Synthetic')`, [qr.id, `${day(offset)}T${String(hour).padStart(2, '0')}:10:00Z`, device, country, ip]);
for (const [offset, device, country, ip] of [[0, 'mobile', 'Saudi Arabia', '198.51.100.1'], [-1, 'mobile', 'Saudi Arabia', '198.51.100.1'],
  [-2, 'desktop', 'Brazil', '198.51.100.2'], [-6, 'mobile', 'Brazil', null], [-12, 'tablet', 'Saudi Arabia', '198.51.100.3'], [-25, 'mobile', 'Brazil', '198.51.100.4']])
  await insert(menu, offset, 10, device, country, ip);
await insert(flyer, -3, 18, 'mobile', 'Saudi Arabia', '198.51.100.5');
await insert(flyer, -4, 18, 'desktop', 'Saudi Arabia', '198.51.100.6');
for (let index = 0; index < 5; index++) await insert(fading, -20, 8, 'mobile', 'Brazil', '198.51.100.7');
await insert(fading, -5, 8, 'mobile', 'Brazil', '198.51.100.7');
await db.end();

const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 60)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });

await page.goto(base + '/overview');
const strip = page.getByRole('list', { name: 'QR Code lifecycle' });
const stripText = await strip.innerText();
check('overview lifecycle counts', ['New (1)', 'Active (2)', 'Declining (1)', 'No scans (1)', 'Paused (0)', 'Direct QR Codes (1)'].every(text => stripText.includes(text)), stripText.replaceAll('\n', ' | '));
await shot('01-visao-geral-ciclo-de-vida');
await strip.getByRole('link', { name: /Declining/ }).click();
await page.waitForURL(/lifecycle=declining/);
const listed = await page.locator('main h3').allInnerTexts();
check('declining link opens the filtered list', listed.length === 1 && listed[0] === 'Fading poster', listed.join(', '));
await shot('02-lista-em-queda');

await page.goto(base + '/analytics');
const metric = async label => Number((await page.locator('dl > div').filter({ hasText: label }).locator('dd').innerText()).replace(/\D/g, ''));
check('analytics defaults to the last 30 days with known totals', await metric('Unique scanners ·') === 7 && await metric('Scans ·') === 14, `${await metric('Scans ·')} scans`);
await shot('03-analytics-30-dias');
await page.getByRole('link', { name: 'Last 7 days' }).click();
await page.waitForURL(/from=/);
check('7-day preset recounts the period', await metric('Scans ·') === 7, String(await metric('Scans ·')));
await page.goto(base + '/analytics');
await page.getByRole('combobox', { name: /^QR Code/ }).selectOption(menu.id);
await page.getByRole('combobox', { name: /^Device/ }).selectOption('mobile');
await page.getByRole('button', { name: 'Apply' }).click();
await page.waitForURL(/device=mobile/);
check('QR and device filters combine', await metric('Scans ·') === 4, String(await metric('Scans ·')));
await shot('04-analytics-filtros');
const pending = page.waitForEvent('download');
await page.getByRole('link', { name: 'Export CSV' }).click();
const csv = readFileSync(await (await pending).path(), 'utf8').replace(/^﻿/, '').trim().split('\r\n');
const exported = csv.slice(1).reduce((sum, line) => sum + Number(line.split(',').at(-3)), 0);
check('CSV export follows the filters', csv[0].startsWith('date_utc,qr_name') && exported === 4 && csv.slice(1).every(line => line.includes('Menu campaign')), `${csv.length - 1} rows, ${exported} scans`);

await page.goto(base + '/my-qrcodes?focus=' + menu.id);
await page.getByRole('button', { name: 'QR details' }).first().click();
await page.getByRole('link', { name: 'Open analytics' }).click();
await page.waitForURL(/\/analytics\?qr=/);
check('detail opens analytics for the same QR', new URL(page.url()).searchParams.get('qr') === menu.id);

await page.getByRole('button', { name: 'Change language' }).click();
await page.getByRole('menuitem', { name: /العربية/ }).click();
await page.goto(base + '/analytics');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic analytics renders RTL', await page.getByRole('heading', { name: 'تحليلات رموز QR' }).isVisible());
await shot('05-analytics-arabe-rtl');
await page.goto(base + '/overview');
check('Arabic lifecycle strip', (await page.getByRole('list', { name: 'دورة حياة رموز QR' }).innerText()).includes('في تراجع'));
await shot('06-visao-geral-arabe');

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + '/analytics');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile analytics has no horizontal overflow', overflow <= 1, `${overflow}px`);
await shot('07-analytics-celular');

const stranger = await browser.newContext();
await stranger.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Other', email: `lot7-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const foreign = await (await stranger.request.get(`${base}/api/analytics?qr=${menu.id}`)).json();
check('another account sees none of these scans', foreign.summary.scans === 0 && foreign.codes.length === 0);
// React #418 on /overview also occurs on main before this lot (pre-existing, tracked separately).
const known = error => error.includes('/overview') && error.includes('#418');
check('no new uncaught page errors', errors.filter(error => !known(error)).length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(result => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
