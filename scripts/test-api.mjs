import { config } from 'dotenv';
import { Pool } from 'pg';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

config({ path: '.env.local', quiet: true });
let original;
try { original = new URL(process.env.TEST_DATABASE_ADMIN_URL || process.env.DATABASE_URL || ''); }
catch { console.error('Configure a private localhost Postgres connection before running API tests.'); process.exit(1); }
if (!['127.0.0.1', 'localhost', '[::1]'].includes(original.hostname)) {
  throw new Error('API tests refuse to create databases outside localhost. Use an isolated local Postgres.');
}
const database = `qrconnect_test_${randomUUID().replaceAll('-', '')}`;
if (!/^qrconnect_test_[a-f0-9]{32}$/.test(database)) throw new Error('Invalid temporary database name');
const connection = new URL(original);
connection.pathname = '/' + database;
// Account email (verification, password reset) is written to a private temporary outbox that the tests read.
const outbox = await mkdtemp(path.join(tmpdir(), 'qrconnect-outbox-'));
// DNS TXT records for custom-domain tests; the app reads them only on a loopback origin.
const dnsFixtures = path.join(outbox, 'dns.json');
const admin = new Pool({ connectionString: original.toString(), max: 1 });
const freePort = () => new Promise((resolve, reject) => {
  const socket = createServer();
  socket.on('error', reject);
  socket.listen(0, '127.0.0.1', () => { const value = socket.address().port; socket.close(() => resolve(value)); });
});
const port = await freePort();
const trustedPort = await freePort();
const base = `http://localhost:${port}`;
// A second server trusts X-Forwarded-For, as behind a proxy that overwrites it. Only scan-counting tests use it,
// because trusted addresses also enable per-address auth rate limits for the rest of the suite.
const trustedBase = `http://localhost:${trustedPort}`;
const env = { ...process.env, DATABASE_URL: connection.toString(), DATABASE_MIGRATION_URL: connection.toString(), APP_URL: base, TEST_BASE_URL: base, TEST_TRUSTED_PROXY_BASE_URL: trustedBase, NEXT_TELEMETRY_DISABLED: '1',
  EMAIL_TRANSPORT: 'outbox', EMAIL_OUTBOX_DIR: outbox, TEST_EMAIL_OUTBOX_DIR: outbox, DNS_TXT_FIXTURES: dnsFixtures, TEST_DNS_FIXTURES: dnsFixtures };
const servers = [];
let created = false;
let output = '';
async function run(args) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  return new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
}
async function start(serverPort, origin, extra = {}) {
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', 'localhost', '--port', String(serverPort)],
    { env: { ...env, APP_URL: origin, ...extra }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  servers.push(server);
  server.stdout.on('data', value => { output = (output + value).slice(-10000); });
  server.stderr.on('data', value => { output = (output + value).slice(-10000); });
  server.on('error', () => {});
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try { const response = await fetch(origin); if (response.ok) return; } catch { /* wait for readiness */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Test server did not become ready. Run npm run build first.');
}
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  created = true;
  if (await run(['--import', 'tsx', 'scripts/migrate.ts'])) throw new Error('Test migrations failed');
  await Promise.all([start(port, base, { TRUST_PROXY_HEADERS: 'false' }), start(trustedPort, trustedBase, { TRUST_PROXY_HEADERS: 'true' })]);
  console.log('Running HTTP integration tests against a disposable local Postgres database.');
  process.exitCode = await run(['--test', ...(process.env.TEST_NAME_PATTERN ? ['--test-name-pattern', process.env.TEST_NAME_PATTERN] : []), 'tests/api.test.mjs']);
} catch {
  console.error('API tests could not run. Check the local database and run npm run build first. Private details hidden.');
  process.exitCode = 1;
} finally {
  for (const server of servers) {
    if (server.exitCode === null) {
      const stopped = new Promise(resolve => server.once('exit', resolve));
      server.kill();
      await stopped;
    }
  }
  if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  await admin.end();
  await rm(outbox, { recursive: true, force: true });
}
