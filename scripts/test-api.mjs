import { config } from 'dotenv';
import { Pool } from 'pg';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';

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
const admin = new Pool({ connectionString: original.toString(), max: 1 });
const port = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.on('error', reject);
  socket.listen(0, '127.0.0.1', () => { const value = socket.address().port; socket.close(() => resolve(value)); });
});
const base = `http://localhost:${port}`;
const env = { ...process.env, DATABASE_URL: connection.toString(), DATABASE_MIGRATION_URL: connection.toString(), APP_URL: base, TEST_BASE_URL: base, NEXT_TELEMETRY_DISABLED: '1' };
let server;
let created = false;
let output = '';
async function run(args) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  return new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
}
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  created = true;
  if (await run(['--import', 'tsx', 'scripts/migrate.ts'])) throw new Error('Test migrations failed');
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', 'localhost', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  server.stdout.on('data', value => { output = (output + value).slice(-10000); });
  server.stderr.on('data', value => { output = (output + value).slice(-10000); });
  server.on('error', () => {});
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try { const response = await fetch(base); if (response.ok) { ready = true; break; } } catch { /* wait for readiness */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Test server did not become ready. Run npm run build first.');
  console.log('Running HTTP integration tests against a disposable local Postgres database.');
  process.exitCode = await run(['--test', ...(process.env.TEST_NAME_PATTERN ? ['--test-name-pattern', process.env.TEST_NAME_PATTERN] : []), 'tests/api.test.mjs']);
} catch {
  console.error('API tests could not run. Check the local database and run npm run build first. Private details hidden.');
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await stopped;
  }
  if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  await admin.end();
}
