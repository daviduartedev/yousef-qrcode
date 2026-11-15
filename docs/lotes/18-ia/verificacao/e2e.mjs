// Lot 18 browser verification against a local production build with a disposable database and the local fixture provider
// (server started with AI_PROVIDER=fixture; no request reaches a real AI provider).
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/18-ia/verificacao/e2e.mjs http://localhost:3198 docs/evidence/lote-18
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, out] = process.argv.slice(2);
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 18', email: `lot18-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled', fullPage: true });

await page.goto(base + '/ai');
check('assisted creation opens from the sidebar', await visible(page.getByRole('heading', { name: 'Assisted creation', level: 1 })) && await visible(page.getByRole('link', { name: 'Assisted creation' })));
await page.getByLabel('Source title').fill('Cardápio');
await page.getByLabel('Source text').fill('Espresso 5, cappuccino 8. Aberto das 8 às 18.');
await page.getByRole('button', { name: 'Save source' }).click();
check('source is saved', await visible(page.getByText('Source saved.')) && await visible(page.getByRole('checkbox', { name: 'Cardápio' })));

await page.getByLabel('Describe it').fill('Página do nosso café com cardápio e Instagram');
await page.getByRole('checkbox', { name: 'Cardápio' }).click();
await page.getByRole('button', { name: 'Write draft' }).click();
check('draft waits in the review queue', await visible(page.getByText('Draft ready for review.')) && await visible(page.getByText('Café Aurora')));
check('invalid items are reported', await visible(page.getByText(/1 invalid items were left out/)));
check('usage and estimated cost are shown', await visible(page.getByText(/Used: 1 of 20 today/)));
await shot('01-fila-de-revisao');

await page.getByRole('button', { name: 'Approve and create draft' }).click();
check('approval saves an unpublished draft', await visible(page.getByText('Draft approved. It was saved unpublished.')) && await visible(page.getByRole('link', { name: 'Open draft' })));
await page.getByRole('link', { name: 'Open draft' }).click();
await page.waitForURL(/\/linkpages\/[0-9a-f-]{36}/);
check('draft opens in the Linkpage editor', await visible(page.getByText('Café Aurora')));
await shot('02-rascunho-no-editor');

await page.goto(base + '/ai');
await page.getByLabel('Form').check();
await page.getByLabel('Describe it').fill('Inscrição para o evento de lançamento');
await page.getByRole('button', { name: 'Write draft' }).click();
check('form draft shows fields and consent', await visible(page.getByText('Event registration')) && await visible(page.getByText(/We use your email only/)));
await page.getByRole('button', { name: 'Reject' }).click();
check('rejected draft leaves the queue', await visible(page.getByText('Draft rejected.')) && await visible(page.getByText('Nothing waiting for review.')));

await page.getByLabel('Describe it').fill('[fail] teste');
await page.getByRole('button', { name: 'Write draft' }).click();
check('provider failure is explained', await visible(page.getByRole('alert').filter({ hasText: 'The assistant could not write a draft. Try again.' })));
await shot('03-historico');

await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/ai');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic assisted creation page', await visible(page.getByRole('heading', { name: 'الإنشاء بمساعدة الذكاء الاصطناعي', level: 1 })));
await shot('04-arabe');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
