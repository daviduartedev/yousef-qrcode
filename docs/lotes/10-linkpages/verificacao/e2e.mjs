// Lot 10 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/10-linkpages/verificacao/e2e.mjs http://localhost:3190 docs/evidence/lote-10
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
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 10', email: `lot10-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });

await page.goto(base + '/overview');
await page.getByRole('link', { name: 'Linkpages' }).click();
await page.waitForURL(/\/linkpages$/);
check('empty state and gallery', await visible(page.getByText('No Linkpages yet.')) && await visible(page.getByRole('heading', { name: 'Start from a template' })));
await page.getByRole('tab', { name: 'Restaurant' }).click();
check('category filter shows the restaurant template only', await page.getByRole('button', { name: /^Use / }).count() === 1);
await shot('01-galeria');
await page.getByRole('tab', { name: 'All' }).click();
await page.getByRole('button', { name: 'Use Small business' }).dblclick();
await page.waitForURL(/\/linkpages\/[0-9a-f-]{36}$/);
const editorUrl = page.url();
const listed = await (await context.request.get(base + '/api/linkpages')).json();
check('double click creates a single draft', listed.linkpages.length === 1);

// Build: profile, blocks, reorder, autosave.
await page.getByLabel('Display name').fill('Padaria Aurora');
await page.getByLabel('Short description').fill('Pão quente todos os dias');
await page.getByRole('button', { name: '+ Link' }).click();
const blocks = page.locator('main ul li[aria-label^="Link"]');
const last = blocks.last();
await last.getByLabel('Button text').fill('Encomendas');
await last.getByLabel('Web address').fill('https://example.test/encomendas');
const moving = page.locator('main ul li[aria-label]').filter({ has: page.locator('input[value="Encomendas"]') });
for (let step = 0; step < 4; step++) await moving.getByRole('button', { name: 'Move up' }).click();
const firstBlock = page.locator('main ul li[aria-label]').first();
check('moved block reaches the top', await firstBlock.getByLabel('Button text').inputValue() === 'Encomendas' && await firstBlock.getByRole('button', { name: 'Move up' }).isDisabled());
check('autosave confirms', await visible(page.getByRole('status').filter({ hasText: 'All changes saved' })));
await page.getByRole('button', { name: '+ Link' }).click();
check('incomplete block blocks saving', await visible(page.getByText('Complete the highlighted fields to save')));
await page.locator('main ul li[aria-label^="Link"]').last().getByRole('button', { name: 'Remove block' }).click();
check('removing it saves again', await visible(page.getByRole('status').filter({ hasText: 'All changes saved' })));
const preview = page.getByRole('complementary', { name: 'Mobile preview' });
check('mobile preview shows the draft', await visible(preview.getByRole('heading', { name: 'Padaria Aurora' })) && await visible(preview.getByText('Encomendas')));

await page.getByRole('tab', { name: 'Style' }).click();
await page.getByText('Forest', { exact: true }).click();
await page.getByText('Pill', { exact: true }).click();
check('style changes autosave', await visible(page.getByRole('status').filter({ hasText: 'All changes saved' })));
await shot('02-editor-estilo');

await page.getByRole('tab', { name: 'Settings' }).click();
const slug = `padaria-${randomUUID().slice(0, 6)}`;
await page.getByLabel('Page address').fill(slug);
await page.getByRole('button', { name: 'Save address' }).click();
check('address saved before publishing', await visible(page.getByRole('status').filter({ hasText: 'Address saved.' })));
const anonymous = await browser.newContext();
check('draft is not public', (await anonymous.request.get(`${base}/p/${slug}`)).status() === 404);
await page.getByRole('button', { name: 'Publish', exact: true }).click();
check('publish confirms', await visible(page.getByText('Published. Your page is live.')));
check('address is locked after publishing', await page.getByLabel('Page address').isDisabled());
await shot('03-publicada-configuracoes');

// Public page without a session, on a phone.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
const visitor = await phone.newPage();
visitor.on('pageerror', error => errors.push(visitor.url() + ' ' + String(error).slice(0, 80)));
await visitor.goto(`${base}/p/${slug}`);
check('public page shows the published content', await visible(visitor.getByRole('heading', { name: 'Padaria Aurora' })));
const order = (await visitor.locator('main a[data-block-id]').allInnerTexts()).filter(text => text.trim());
check('reordered block comes first', order[0]?.includes('Encomendas'), order.join(' | '));
const overflow = await visitor.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('public page fits the phone', overflow <= 1, `overflow ${overflow}px`);
await visitor.screenshot({ path: `${out}/04-pagina-publica-celular.png`, fullPage: true });
await visitor.waitForTimeout(500);
const outbound = visitor.waitForRequest(request => request.url().startsWith('https://example.test/encomendas'), { timeout: 10000 }).then(() => true, () => false);
await visitor.getByRole('link', { name: 'Encomendas' }).click();
check('click goes to the block address', await outbound);

// Edits after publishing keep the URL; visitors see them only after publishing again.
await page.getByRole('tab', { name: 'Content' }).click();
await page.getByLabel('Display name').fill('Padaria Aurora Centro');
await visible(page.getByRole('status').filter({ hasText: 'All changes saved' }));
check('unpublished changes are flagged', await visible(page.getByText('Published · unpublished changes')));
const before = await (await anonymous.request.get(`${base}/p/${slug}`)).text();
check('visitors still see the published version', before.includes('Padaria Aurora') && !before.includes('Aurora Centro'));
await page.getByRole('button', { name: 'Publish changes' }).click();
await visible(page.getByText('Published. Your page is live.'));
check('same address shows the new version', (await (await anonymous.request.get(`${base}/p/${slug}`)).text()).includes('Aurora Centro'));

// QR code for the page.
await page.getByRole('tab', { name: 'Settings' }).click();
await page.getByRole('button', { name: 'Create QR code' }).click();
await page.waitForURL(/\/app\?edit=/);
const qrId = new URL(page.url()).searchParams.get('edit');
const qr = (await (await context.request.get(`${base}/api/qr-codes/${qrId}`)).json()).qrCode;
check('QR points to the stable page address', qr.destination_url === `${base}/p/${slug}`, qr.destination_url);

// Analytics with the visit above.
await page.goto(editorUrl + '/analytics');
const views = page.locator('dl > div').filter({ hasText: /^Views/ }).locator('dd').first();
check('analytics counts the phone visit', (await views.innerText()).trim() === '1', await views.innerText());
check('click is attributed to its block', await visible(page.getByRole('region', { name: 'Clicks per block' }).getByText('Encomendas')).catch(() => false)
  || await visible(page.locator('section').filter({ hasText: 'Clicks per block' }).getByText('Encomendas')));
await shot('05-analytics');

// Arabic list and another account.
await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/linkpages');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic Linkpages list', await visible(page.getByRole('heading', { name: 'صفحات الروابط', exact: true })));
await shot('06-lista-arabe');
const stranger = await browser.newContext();
await stranger.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Other', email: `lot10-o-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const strangerPage = await stranger.newPage();
const response = await strangerPage.goto(editorUrl);
check('another account cannot open the editor', response.status() === 404);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
