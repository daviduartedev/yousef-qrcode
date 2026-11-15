// Lot 12 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/12-forms/verificacao/e2e.mjs http://localhost:3192 docs/evidence/lote-12
import { mkdirSync, readFileSync } from 'node:fs';
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
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 12', email: `lot12-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });
const panel = () => page.getByRole('tabpanel');
const saved = () => visible(page.getByRole('status').filter({ hasText: 'All changes saved' }));

await page.goto(base + '/overview');
await page.getByRole('link', { name: 'Forms' }).click();
await page.waitForURL(/\/forms$/);
check('empty forms page with templates', await visible(page.getByText('No forms yet.')) && await page.getByRole('button', { name: /^Use / }).count() === 5);
await shot('01-formularios-vazio');
await page.getByRole('button', { name: 'Use Event registration' }).dblclick();
await page.waitForURL(/\/forms\/[0-9a-f-]{36}$/);
const editorUrl = page.url();
check('double click creates one form', (await (await context.request.get(base + '/api/forms')).json()).forms.length === 1);

await panel().getByLabel('Form title').fill('Inscrição no workshop');
await page.getByRole('button', { name: '+ Choice' }).click();
const choice = panel().locator('li[aria-label="Question 6"]');
await choice.getByLabel('Question', { exact: true }).fill('Turma');
check('choice with default options saves', await saved());
await choice.getByLabel('Options, one per line').fill('Manhã\nTarde');
await choice.getByLabel('Required').check();
await choice.getByRole('button', { name: 'Move up' }).click();
check('edited question autosaves', await saved());
await page.getByRole('button', { name: '+ Short text' }).click();
check('empty question blocks saving', await visible(page.getByText('Complete the highlighted fields to save')));
await panel().locator('li[aria-label="Question 7"]').getByRole('button', { name: 'Remove question' }).click();
check('removing it saves again', await saved());
const preview = page.getByRole('complementary', { name: 'Preview' });
check('preview shows the new question', await visible(preview.getByText('Turma')));
await page.getByRole('tab', { name: 'Settings' }).click();
await panel().getByLabel('Ask people to accept a consent text before sending').check();
await panel().getByRole('textbox', { name: 'Consent text' }).fill('Autorizo o contato sobre a inscrição.');
check('consent settings save', await saved());
await shot('02-editor-formulario');
await page.getByRole('button', { name: 'Publish', exact: true }).click();
check('form publishes', await visible(page.getByText('Published. Your form is live.')));
const form = (await (await context.request.get(editorUrl.replace('/forms/', '/api/forms/'))).json()).form;

// Public form on a phone, without an account.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const visitor = await phone.newPage();
visitor.on('pageerror', error => errors.push(visitor.url() + ' ' + String(error).slice(0, 80)));
await visitor.goto(`${base}/f/${form.slug}`);
check('public form opens without an account', await visible(visitor.getByRole('heading', { name: 'Inscrição no workshop' })));
await visitor.getByRole('button', { name: 'Register' }).click();
check('required answers are reported per field', await visible(visitor.getByRole('alert').filter({ hasText: 'Check the highlighted answers' }))
  && await visitor.getByLabel('Full name *').getAttribute('aria-invalid') === 'true' && await visible(visitor.getByText('Accept the consent to send your answers')));
check('focus moves to the first invalid answer', await visitor.evaluate(() => document.activeElement?.getAttribute('aria-invalid')) === 'true');
await visitor.screenshot({ path: `${out}/03-formulario-publico-erros.png`, fullPage: true });
await visitor.getByLabel('Full name *').fill('Ana Souza');
await visitor.getByLabel('Email *').fill('ana@example.com');
await visitor.getByLabel('Number of guests *').fill('2');
await visitor.getByLabel('Turma *').selectOption('Tarde');
await visitor.getByLabel('Arrival date').fill('2026-12-01');
await visitor.getByRole('checkbox', { name: /Autorizo/ }).check();
// Submissions need a page loaded at least two seconds earlier, as a person filling the form would.
await visitor.waitForTimeout(2500);
await visitor.getByRole('button', { name: 'Register' }).click();
check('answer is accepted', await visible(visitor.getByRole('status').filter({ hasText: 'Thank you!' })));
const overflow = await visitor.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('public form fits the phone', overflow <= 1, `overflow ${overflow}px`);

// Owner: answers table, CSV, closing the form.
await page.goto(editorUrl + '/responses');
check('answer appears for the owner', await visible(page.getByRole('cell', { name: 'Ana Souza' })) && await visible(page.getByRole('cell', { name: 'Tarde' })));
const download = page.waitForEvent('download');
await page.getByRole('link', { name: 'Export CSV' }).click();
const csv = readFileSync(await (await download).path(), 'utf8');
check('CSV has the questions and the answer', csv.includes('Turma') && csv.includes('Ana Souza') && csv.includes('Autorizo o contato'));
await shot('04-respostas');
await page.goto(editorUrl);
await page.getByRole('tab', { name: 'Settings' }).click();
await panel().getByLabel('Accept new answers').click();
check('form can be closed', await visible(page.getByText('The form stopped accepting answers.')));
await visitor.goto(`${base}/f/${form.slug}`);
check('closed form tells visitors', await visible(visitor.getByText('This form is not accepting answers right now.')));

await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/forms');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic forms page', await visible(page.getByRole('heading', { name: 'النماذج', exact: true })));
await shot('05-formularios-arabe');
const stranger = await browser.newContext();
await stranger.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Other', email: `lot12-o-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
check('another account cannot open the answers', (await (await stranger.newPage()).goto(editorUrl + '/responses')).status() === 404);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
