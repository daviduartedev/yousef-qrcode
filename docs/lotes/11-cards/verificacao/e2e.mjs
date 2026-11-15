// Lot 11 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/11-cards/verificacao/e2e.mjs http://localhost:3191 docs/evidence/lote-11
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, out] = process.argv.slice(2);
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
const saved = page => visible(page.getByRole('status').filter({ hasText: 'All changes saved' }));

// Synthetic vCard with Arabic text, as exported by a phone.
const vcf = path.join(tmpdir(), `lot11-${randomUUID()}.vcf`);
writeFileSync(vcf, 'BEGIN:VCARD\r\nVERSION:3.0\r\nN;CHARSET=UTF-8:الحداد;سارة;;;\r\nFN;CHARSET=UTF-8:سارة الحداد\r\nORG:شركة المثال\r\nTITLE:مديرة المبيعات\r\nTEL;TYPE=CELL:+966500000000\r\nEMAIL;TYPE=WORK:sara@example.com\r\nURL:https://example.com/\r\nEND:VCARD\r\n');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Lot 11', email: `lot11-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });

await page.goto(base + '/overview');
await page.getByRole('link', { name: 'Cards' }).click();
await page.waitForURL(/\/cards$/);
check('empty cards page with styles', await visible(page.getByText('No cards yet.')) && await page.getByRole('button', { name: /^Use / }).count() === 5);
await shot('01-cartoes-vazio');
await page.getByRole('button', { name: 'Use Night' }).dblclick();
await page.waitForURL(/\/cards\/[0-9a-f-]{36}$/);
const editorUrl = page.url();
check('double click creates one card', (await (await context.request.get(base + '/api/cards')).json()).cards.length === 1);

await page.locator('input[type=file][accept*=vcf]').setInputFiles(vcf);
check('vCard import fills the profile', await visible(page.getByText('Contact imported.')) && await page.getByRole('tabpanel').getByLabel('First name').inputValue() === 'سارة'
  && await page.getByRole('tabpanel').getByLabel('Company').inputValue() === 'شركة المثال');
check('imported card autosaves', await saved(page));
const preview = page.getByRole('complementary', { name: 'Mobile preview' });
check('preview shows the imported name', await visible(preview.getByRole('heading', { name: 'سارة الحداد' })));
await page.getByRole('tab', { name: 'Contact', exact: true }).click();
check('imported phone and email', await page.getByRole('tabpanel').getByLabel('Phone number', { exact: true }).first().inputValue() === '+966500000000' && await page.getByRole('tabpanel').getByLabel('Email address', { exact: true }).first().inputValue() === 'sara@example.com');
await page.getByRole('tabpanel').getByLabel('Address', { exact: true }).fill('Riyadh');
await page.getByRole('tab', { name: 'Social links' }).click();
await page.getByRole('button', { name: '+ Add social link' }).click();
check('incomplete link blocks saving', await visible(page.getByText('Complete the highlighted fields to save')));
await page.getByRole('tabpanel').getByLabel('Web address', { exact: true }).fill('https://linkedin.com/in/sara');
check('completed link saves', await saved(page));
await page.getByRole('tab', { name: 'Contact exchange' }).click();
await page.getByRole('tabpanel').getByLabel('Why you ask for their details').fill('Vou enviar o catálogo.');
await saved(page);
await shot('02-editor-cartao');
await page.getByRole('button', { name: 'Publish', exact: true }).click();
check('card publishes', await visible(page.getByText('Published. Your card is live.')));
const slug = (await (await context.request.get(editorUrl.replace('/cards/', '/api/cards/'))).json()).card.slug;

// Public card on a phone, without a session.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, acceptDownloads: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
const visitor = await phone.newPage();
visitor.on('pageerror', error => errors.push(visitor.url() + ' ' + String(error).slice(0, 80)));
await visitor.goto(`${base}/c/${slug}`);
check('public card shows the profile', await visible(visitor.getByRole('heading', { name: 'سارة الحداد' })) && await visible(visitor.getByText('مديرة المبيعات · شركة المثال')));
const overflow = await visitor.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('public card fits the phone', overflow <= 1, `overflow ${overflow}px`);
await visitor.screenshot({ path: `${out}/03-cartao-publico-celular.png`, fullPage: true });
const download = visitor.waitForEvent('download');
await visitor.getByRole('link', { name: 'Save contact' }).click();
const file = await download;
const text = readFileSync(await file.path(), 'utf8');
check('save contact downloads a UTF-8 vCard', file.suggestedFilename().endsWith('.vcf') && text.replace(/\r\n /g, '').includes('FN;CHARSET=UTF-8:سارة الحداد'), file.suggestedFilename());
const call = visitor.waitForRequest(request => request.url().startsWith('tel:') || request.url().includes('/go/phone-0'), { timeout: 5000 }).then(() => true, () => false);
await visitor.locator('a[data-target="phone-0"]').click();
check('call button goes through the counted action', await call);

await visitor.goto(`${base}/c/${slug}`);
await visitor.getByRole('button', { name: 'Send my contact' }).click();
check('exchange requires consent', await visible(visitor.getByRole('alert').filter({ hasText: 'Accept the consent' })));
await visitor.getByLabel('Name').fill('Ana Souza');
await visitor.getByLabel('Email').fill('ana@example.com');
await visitor.getByLabel('Company').fill('Acme');
await visitor.getByRole('checkbox').check();
check('consent text is the owner purpose', await visible(visitor.getByText('Vou enviar o catálogo.')));
await visitor.getByRole('button', { name: 'Send my contact' }).click();
check('contact is sent', await visible(visitor.getByRole('status').filter({ hasText: 'Thank you!' })));

// Owner: contacts, analytics, Arabic.
await page.goto(base + '/cards/contacts');
check('contact appears in the manager', await visible(page.getByRole('cell', { name: 'Ana Souza' })) && await visible(page.getByRole('cell', { name: 'Acme' })));
await shot('04-contatos');
await page.goto(editorUrl + '/analytics');
const metric = label => page.locator('dl > div').filter({ hasText: new RegExp(`^${label}`) }).locator('dd').first().innerText();
check('analytics counts views, saves, actions and contacts', (await metric('Views')).trim() === '2' && (await metric('Contact saves')).trim() === '1'
  && (await metric('Contact actions')).trim() === '1' && (await metric('Contacts received')).trim() === '1',
  [await metric('Views'), await metric('Contact saves'), await metric('Contact actions'), await metric('Contacts received')].join('/'));
await shot('05-analytics-cartao');
await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/cards');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic cards page', await visible(page.getByRole('heading', { name: 'بطاقات الأعمال الرقمية' })));
await shot('06-cartoes-arabe');
const stranger = await browser.newContext();
await stranger.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name: 'Other', email: `lot11-o-${randomUUID()}@example.test`, password: randomUUID() + '+' } });
check('another account cannot open the editor', (await (await stranger.newPage()).goto(editorUrl)).status() === 404);
check('another account sees no contacts', (await (await stranger.request.get(base + '/api/cards/contacts')).json()).contacts.length === 0);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
