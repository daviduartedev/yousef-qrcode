// Lot 8 browser verification against a local production build with a disposable database and a local email outbox.
// Usage: PLAYWRIGHT_MODULE=<file URL of playwright/index.mjs> [CHROMIUM_PATH=<browser exe>] \
//   node docs/lotes/08-site-publico-e-entrada/verificacao/e2e.mjs http://localhost:3188 <outbox folder> docs/evidence/lote-08
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [base, outbox, out] = process.argv.slice(2);
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('local only');
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const visible = locator => locator.first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
const mail = async (to, kind) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    for (const file of readdirSync(outbox).sort().reverse()) {
      const message = JSON.parse(readFileSync(`${outbox}/${file}`, 'utf8'));
      if (message.to === to && message.kind === kind) return message;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(page.url() + ' ' + String(error).slice(0, 80)));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });

// Public site: every link resolves to a real section or page.
await page.goto(base + '/');
const hrefs = await page.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')));
check('no placeholder links on the landing page', !hrefs.some(href => href === '#' || href === ''), `${hrefs.length} links`);
const anchors = [...new Set(hrefs.filter(href => href.startsWith('/#') || href.startsWith('#')).map(href => href.split('#')[1]))];
const missing = [];
for (const id of anchors) if (!(await page.locator(`[id="${id}"]`).count())) missing.push(id);
check('every section link has a target', missing.length === 0, anchors.join(', ') + (missing.length ? ' missing ' + missing : ''));
const pages = [...new Set(hrefs.filter(href => href.startsWith('/') && !href.startsWith('/#')))];
const statuses = [];
for (const href of pages) statuses.push(`${href}:${(await context.request.get(base + href, { maxRedirects: 0 })).status()}`);
check('every page link answers', statuses.every(item => /:(200|307)$/.test(item)), statuses.join(' '));
await shot('01-site-publico-desktop');
await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Pricing' }).click();
await page.waitForURL(/#pricing$/);
check('header link scrolls to pricing', await visible(page.locator('#pricing')));

await page.locator('main').getByRole('link', { name: 'Start Free Trial' }).first().click();
await page.waitForURL(/\/auth\?mode=signup/);
check('hero call to action opens sign-up', await visible(page.getByLabel('Name')));

// Sign-up validation and errors are tied to their fields.
await page.getByRole('button', { name: 'Create account' }).click();
const nameField = page.getByLabel('Name');
const emailError = await visible(page.getByText('Enter a valid email address.'));
check('empty sign-up marks fields and focuses the first', emailError && await nameField.getAttribute('aria-invalid') === 'true'
  && await page.evaluate(() => document.activeElement?.getAttribute('name')) === 'name');
const email = `lot8-${randomUUID()}@example.test`;
const password = randomUUID() + 'A';
await nameField.fill('Lot 8 validation');
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password', { exact: true }).fill(password);
await page.getByLabel('Confirm password').fill(password + 'x');
await page.getByRole('button', { name: 'Create account' }).click();
check('mismatched confirmation is reported', await visible(page.getByText('The passwords do not match.')));
await shot('02-cadastro-erros');
await page.getByLabel('Confirm password').fill(password);
await page.getByRole('button', { name: 'Create account' }).click();
await page.waitForURL(/\/overview$/);
check('sign-up lands on the overview', true);
const verification = await mail(email, 'verify-email');
check('confirmation email is sent in English and Arabic', verification && /Confirm the email/.test(verification.text) && /أكّد/.test(verification.text));

await page.goto(base + '/');
check('signed-in visitors see the dashboard shortcut', await visible(page.getByRole('link', { name: 'Open dashboard' })));
await page.goto(base + '/auth');
await page.waitForURL(/\/overview$/);
check('signed-in visitors skip the sign-in page', true);

await page.goto(verification.url);
await page.waitForURL(/\/overview$/);
const session = await (await context.request.get(base + '/api/auth/get-session')).json();
check('confirmation link verifies the address', session?.user?.emailVerified === true);

// Sign out, private page return and wrong password.
await page.getByRole('button', { name: /Sign out|Log out|Logout/ }).first().click();
await page.waitForURL(base + '/');
await page.goto(base + '/analytics?preset=7');
await page.waitForURL(/\/auth\?next=%2Fanalytics%3Fpreset%3D7/);
check('private page asks to sign in and keeps the return address', true);
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password', { exact: true }).fill('wrong-password');
await page.getByRole('button', { name: 'Sign in' }).click();
check('wrong password shows an alert', await visible(page.getByRole('alert').filter({ hasText: 'Email or password is incorrect.' })));
await shot('03-login-erro');
await page.getByLabel('Password', { exact: true }).fill(password);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/\/analytics\?preset=7$/);
check('sign-in returns to the requested page', true);

// Password recovery through the local outbox.
await context.clearCookies();
await page.goto(base + '/auth');
await page.getByRole('link', { name: 'Forgot password?' }).click();
await page.waitForURL(/\/auth\/forgot-password$/);
await page.getByLabel('Email').fill(email);
await page.getByRole('button', { name: 'Send reset link' }).click();
check('reset request answers without revealing the account', await visible(page.getByRole('status').filter({ hasText: 'If an account exists' })));
await shot('04-recuperacao-enviada');
const reset = await mail(email, 'reset-password');
check('reset email is sent', Boolean(reset));
await page.goto(reset.url);
await page.waitForURL(url => url.pathname === '/auth/reset-password');
check("reset token is removed from the address bar", await page.waitForFunction(() => !location.search.includes("token")).then(() => true, () => false));
const newPassword = randomUUID() + 'B';
await page.getByLabel('New password', { exact: true }).fill(newPassword);
await page.getByLabel('Confirm password').fill(newPassword + 'x');
await page.getByRole('button', { name: 'Change password' }).click();
check('reset form checks the confirmation', await visible(page.getByText('The passwords do not match.')));
await page.getByLabel('Confirm password').fill(newPassword);
await page.getByRole('button', { name: 'Change password' }).click();
await page.waitForURL(/\/auth\?reset=success$/);
check('reset confirms and returns to sign-in', await visible(page.getByRole('status').filter({ hasText: 'Your password was changed' })));
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password', { exact: true }).fill(newPassword);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/\/overview$/);
check('new password signs in', true);
await page.goto(reset.url);
await page.waitForURL(url => url.pathname === '/auth/reset-password');
check('used reset link is refused', await visible(page.getByRole('alert').filter({ hasText: 'invalid or expired' })));
await shot('05-link-expirado');

// Mobile and Arabic.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const phone = await mobile.newPage();
phone.on('pageerror', error => errors.push(phone.url() + ' ' + String(error).slice(0, 80)));
await phone.goto(base + '/');
const menu = phone.getByRole('button', { name: 'Open menu' });
await menu.click();
check('mobile menu opens with sections and sign-in', await visible(phone.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'FAQ' }))
  && await phone.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded') === 'true');
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('mobile landing has no horizontal scroll', overflow <= 1, `overflow ${overflow}px`);
await phone.screenshot({ path: `${out}/06-site-publico-celular-menu.png` });
await phone.keyboard.press('Escape');
check('Escape closes the mobile menu', await visible(phone.getByRole('button', { name: 'Open menu' })));
await phone.evaluate(() => localStorage.setItem('i18nextLng', 'ar'));
await phone.goto(base + '/auth?mode=signup');
await phone.waitForFunction(() => document.documentElement.dir === 'rtl');
check('Arabic sign-up is right-to-left', await visible(phone.getByRole('heading', { name: 'أنشئ حسابك' })));
await phone.getByRole('button', { name: 'إنشاء حساب' }).click();
check('Arabic validation messages', await visible(phone.getByText('أدخل اسمك.')));
const authOverflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('Arabic sign-up fits the phone', authOverflow <= 1, `overflow ${authOverflow}px`);
await phone.screenshot({ path: `${out}/07-cadastro-arabe-celular.png` });
await phone.goto(base + '/');
await phone.waitForFunction(() => document.documentElement.dir === 'rtl');
await phone.screenshot({ path: `${out}/08-site-publico-arabe-celular.png` });
check('Arabic landing header', await visible(phone.getByRole('link', { name: 'ابدأ التجربة المجانية' }).first())
  || await visible(phone.getByRole('button', { name: 'فتح القائمة' })));

const unexpected = errors;
check('no unexpected page errors', unexpected.length === 0, unexpected.join(' | '));
await browser.close();
const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
