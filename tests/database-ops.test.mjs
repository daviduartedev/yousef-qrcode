import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, appendFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'dotenv';
import { Pool } from 'pg';

const cli = resolve('scripts/database-ops.mjs');
mkdirSync(resolve('.scratch'), { recursive: true });

async function database(t, environment = 'local') {
  const privateConfig = parse(readFileSync('.env.local'));
  const url = new URL(privateConfig.TEST_DATABASE_ADMIN_URL || privateConfig.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Operational tests require an isolated localhost database.');
  const name = 'qrconnect_ops_' + crypto.randomUUID().replaceAll('-', '');
  const admin = new Pool({ connectionString: url.toString(), max: 1 });
  const dir = mkdtempSync(resolve('.scratch/ops-test-'));
  let created = false;
  let db;
  t.after(async () => {
    await db?.end();
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
    rmSync(dir, { recursive: true, force: true });
  });
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    url.pathname = '/' + name;
    db = new Pool({ connectionString: url.toString(), max: 1 });
  } catch { throw new Error('Could not create an isolated local operations database.'); }
  const config = join(dir, '.env.operations');
  writeFileSync(config, `OPERATIONS_ENVIRONMENT=${environment}\nDATABASE_URL=${url}\nAPP_URL=http://localhost:3000\nBETTER_AUTH_SECRET=${crypto.randomUUID()}\n`);
  return { db, config, dir, run: (command, ...args) => spawnSync(process.execPath,
    [cli, command, '--config', config, '--environment', environment, ...args], { encoding: 'utf8', windowsHide: true }) };
}

test('database operations reject an unexpected environment without revealing private values', t => {
  const dir = mkdtempSync(resolve('.scratch/ops-guard-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const secret = crypto.randomUUID();
  const config = join(dir, '.env.operations');
  writeFileSync(config, `OPERATIONS_ENVIRONMENT=production\nDATABASE_URL=postgresql://dummy:${secret}@invalid.example/postgres?sslmode=verify-full\n`);
  const result = spawnSync(process.execPath, [cli, 'prepare', '--config', config, '--environment', 'staging'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /environment/i);
  assert.ok(!(result.stdout + result.stderr).includes(secret));
});

test('preparing a new database applies the schema once and refuses to overwrite an initialized database', async t => {
  const fixture = await database(t);
  let result = fixture.run('prepare');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).initialized, true);
  await fixture.db.query('INSERT INTO qrconnect."user" (id, name, email) VALUES ($1, $2, $3)',
    [crypto.randomUUID(), 'Disposable operator', 'operator@example.test']);
  result = fixture.run('prepare');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already initialized/i);
  result = fixture.run('inspect');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).counts.user, '1');
});

test('a private backup restores records, design and scan history into a separate empty database', async t => {
  const source = await database(t);
  const target = await database(t, 'restore');
  const archive = resolve('backups/ops-test-' + crypto.randomUUID());
  t.after(() => rmSync(archive, { recursive: true, force: true }));
  assert.equal(source.run('prepare').status, 0);
  const userId = crypto.randomUUID();
  const qrId = crypto.randomUUID();
  await source.db.query('INSERT INTO qrconnect."user" (id, name, email) VALUES ($1, $2, $3)', [userId, 'Recovery fixture', 'restore@example.test']);
  await source.db.query(`INSERT INTO qrconnect.qr_codes (id, user_id, short_code, destination_url, design, tracking_enabled, total_scans)
    VALUES ($1, $2, 'restore-fixture', 'https://example.test/after-cutover', '{"version":1,"fixture":"after-cutover"}', false, 1)`, [qrId, userId]);
  await source.db.query('INSERT INTO qrconnect.qr_scans (qr_code_id) VALUES ($1)', [qrId]);
  let result = source.run('backup', '--out', archive);
  assert.equal(result.status, 0, result.stderr);
  result = target.run('restore', '--from', archive);
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(result.stdout);
  assert.equal(state.counts.user, '1');
  assert.equal(state.counts.qr_codes, '1');
  assert.equal(state.counts.qr_scans, '1');
  assert.equal(state.rowSecurityEnabled, true);
  // SQL is the public output of a database restore, rather than an auth implementation detail.
  const { rows } = await target.db.query('SELECT short_code, destination_url, design, tracking_enabled, total_scans FROM qrconnect.qr_codes');
  assert.deepEqual(rows, [{ short_code: 'restore-fixture', destination_url: 'https://example.test/after-cutover',
    design: { version: 1, fixture: 'after-cutover' }, tracking_enabled: false, total_scans: 1 }]);
  result = target.run('restore', '--from', archive);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /never overwritten/i);
  const untouched = target.run('inspect');
  assert.equal(JSON.parse(untouched.stdout).counts.qr_scans, '1');
  const sameSourceConfig = join(source.dir, '.env.restore');
  writeFileSync(sameSourceConfig, readFileSync(source.config, 'utf8').replace('OPERATIONS_ENVIRONMENT=local', 'OPERATIONS_ENVIRONMENT=restore'));
  result = spawnSync(process.execPath, [cli, 'restore', '--config', sameSourceConfig, '--environment', 'restore', '--from', archive], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /original source/i);
  appendFileSync(join(archive, 'database.dump'), 'invalid');
  result = target.run('restore', '--from', archive);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /integrity/i);
});

test('preparation refuses a database containing unrelated public tables', async t => {
  const fixture = await database(t);
  await fixture.db.query('CREATE TABLE public.existing_data (id integer); INSERT INTO public.existing_data VALUES (17)');
  const result = fixture.run('prepare');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /public tables/i);
  const { rows } = await fixture.db.query('SELECT id FROM public.existing_data');
  assert.deepEqual(rows, [{ id: 17 }]);
});
