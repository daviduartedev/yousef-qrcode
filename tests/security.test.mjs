import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = resolve('scripts/check-secrets.mjs');
function repository(t) {
  const dir = mkdtempSync(join(tmpdir(), 'qr-security-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  git('init', '--quiet');
  return { dir, git, check: (args = ['--staged']) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' }) };
}

test('the working-tree scan permits a tracked deletion and still rejects secrets in remaining files', t => {
  const { dir, git, check } = repository(t);
  writeFileSync(join(dir, 'obsolete.ts'), 'export const obsolete = true;');
  git('add', 'obsolete.ts');
  rmSync(join(dir, 'obsolete.ts'));
  assert.equal(check([]).status, 0);
  const token = ['sb', 'secret', crypto.randomUUID().replaceAll('-', '')].join('_');
  writeFileSync(join(dir, 'remaining.ts'), `export const key = '${token}';`);
  const result = check([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /provider-token/);
  assert.ok(!result.stderr.includes(token));
});

test('Git rejects a force-staged environment file without echoing its values', t => {
  const { dir, git, check } = repository(t);
  const value = 'temporary-' + crypto.randomUUID();
  writeFileSync(join(dir, '.env.local'), `DATABASE_PASSWORD=${value}\n`);
  git('add', '--force', '.env.local');
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /environment-file/);
  assert.ok(!(result.stdout + result.stderr).includes(value));
});

test('Git rejects an embedded database credential in an otherwise normal source file', t => {
  const { dir, git, check } = repository(t);
  const value = `postgresql://app:${crypto.randomUUID()}@db.internal:5432/app`;
  writeFileSync(join(dir, 'connection.ts'), `export const connection = ${JSON.stringify(value)};`);
  git('add', 'connection.ts');
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /credential-url/);
  assert.ok(!(result.stdout + result.stderr).includes(value));
});

test('Git permits ordinary source and placeholder-only environment examples', t => {
  const { dir, git, check } = repository(t);
  writeFileSync(join(dir, 'safe.ts'), 'export const product = "QRConnect";');
  writeFileSync(join(dir, '.env.example'), 'DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE\nBETTER_AUTH_SECRET=REPLACE_WITH_RANDOM_SECRET\n');
  git('add', 'safe.ts', '.env.example');
  assert.equal(check().status, 0);
});

test('Git scans the staged version, even when the working copy has been cleaned', t => {
  const { dir, git, check } = repository(t);
  const token = ['sb', 'secret', crypto.randomUUID().replaceAll('-', '')].join('_');
  writeFileSync(join(dir, 'config.ts'), `export const key = '${token}';`);
  git('add', 'config.ts');
  writeFileSync(join(dir, 'config.ts'), 'export const key = process.env.PROVIDER_KEY;');
  const result = check();
  assert.equal(result.status, 1);
  assert.ok(!(result.stdout + result.stderr).includes(token));
});

test('Git rejects real secrets inside an environment example too', t => {
  const { dir, git, check } = repository(t);
  const token = ['sb', 'secret', crypto.randomUUID().replaceAll('-', '')].join('_');
  writeFileSync(join(dir, '.env.example'), `PROVIDER_KEY=${token}`);
  git('add', '.env.example');
  assert.equal(check().status, 1);
});
