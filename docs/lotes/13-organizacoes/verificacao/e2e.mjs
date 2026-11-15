// Lot 13 browser verification against a local production build with a disposable database.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/13-organizacoes/verificacao/e2e.mjs http://localhost:3193 docs/evidence/lote-13
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
const errors = [];
async function account(name) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const email = `lot13-${name.toLowerCase()}-${randomUUID()}@example.test`;
  await context.request.post(base + '/api/auth/sign-up/email', { headers: { origin: base }, data: { name, email, password: randomUUID() + '+' } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
  return { context, page, email };
}
const owner = await account('Owner');
const member = await account('Member');
const page = owner.page;
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });

// Existing personal content stays where it was.
await owner.context.request.post(base + '/api/qr-codes', { headers: { origin: base }, data: { title: 'Personal flyer', destination_url: 'https://example.test/me' } });
await page.goto(base + '/overview');
const switcher = page.getByLabel('Workspace').first();
check('switcher starts in the personal workspace', await visible(switcher) && (await switcher.locator('option:checked').innerText()).startsWith('Personal workspace'));
await page.getByRole('link', { name: 'Organization' }).click();
await page.waitForURL(/\/settings\/organization$/);
check('personal workspace explains organizations', await visible(page.getByText('This is your personal workspace.')));
await page.getByLabel('Organization name').fill('Acme Marketing');
await page.getByRole('button', { name: 'Create organization' }).click();
check('organization is created', await visible(page.getByText('Organization created.')));
await page.getByRole('button', { name: 'Switch' }).click();
check('switching shows the organization settings', await visible(page.getByRole('heading', { name: 'Members' })));
await shot('01-organizacao-membros');

await page.goto(base + '/my-qrcodes');
check('organization starts without the personal QR codes', !(await page.getByText('Personal flyer').count()));
await owner.context.request.post(base + '/api/qr-codes', { headers: { origin: base }, data: { title: 'Org poster', destination_url: 'https://example.test/org' } });

await page.goto(base + '/settings/organization');
await page.getByLabel('Email', { exact: true }).fill(member.email);
await page.getByLabel('Role', { exact: true }).selectOption('viewer');
await page.getByRole('button', { name: 'Invite', exact: true }).click();
check('invitation link is shown', await visible(page.getByText('Invitation created.')));
const link = await page.locator('code').innerText();
check('pending invitation is listed', await visible(page.getByText(member.email)));
await shot('02-convite-criado');

await member.page.goto(link);
check('member sees the invitation', await visible(member.page.getByRole('heading', { name: 'Join Acme Marketing' })) && await visible(member.page.getByText('You were invited as viewer.')));
await member.page.screenshot({ path: `${out}/03-aceitar-convite.png` });
await member.page.getByRole('button', { name: 'Accept invitation' }).click();
await member.page.waitForURL(/\/overview$/);
check('member lands in the organization', (await member.page.getByLabel('Workspace').first().locator('option:checked').innerText()).startsWith('Acme Marketing'));
await member.page.goto(base + '/my-qrcodes');
check('member sees organization content', await visible(member.page.getByText('Org poster')));
const blocked = await member.context.request.post(base + '/api/qr-codes', { headers: { origin: base }, data: { title: 'x', destination_url: 'https://example.test/' } });
check('viewer cannot create content', blocked.status() === 403);

await page.reload();
const memberRole = page.getByLabel(/^Role of Member/);
await memberRole.selectOption('editor');
check('owner promotes the member', await visible(page.getByText('Role updated.')));
const allowed = await member.context.request.post(base + '/api/qr-codes', { headers: { origin: base }, data: { title: 'Member QR', destination_url: 'https://example.test/m' } });
check('editor can now create content', allowed.status() === 201);
page.once('dialog', dialog => void dialog.accept());
await page.getByRole('button', { name: /^Remove Member/ }).click();
check('owner removes the member', await visible(page.getByText('Member removed.')));
await member.page.goto(base + '/my-qrcodes');
check('removed member no longer sees organization content', !(await member.page.getByText('Org poster').count()) && !(await member.page.getByText('Member QR').count()));

// Arabic and phone.
await page.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await page.goto(base + '/settings/organization');
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic organization page', await visible(page.getByRole('heading', { name: 'الأعضاء' })));
await shot('04-organizacao-arabe');
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: await owner.context.storageState() });
const mobile = await phone.newPage();
await mobile.goto(base + '/settings/organization');
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('organization page fits the phone', overflow <= 1, `overflow ${overflow}px`);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
