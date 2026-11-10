import { readFileSync, realpathSync, mkdirSync, lstatSync, chmodSync, writeFileSync, createReadStream } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { resolve, dirname, basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'dotenv';
import { Pool } from 'pg';

class OperationError extends Error {}
const tables = ['user', 'account', 'session', 'verification', 'qr_codes', 'qr_scans'];

function backupDirectory(input, create = false) {
  if (!input) throw new OperationError('Provide a private backup directory.');
  const root = resolve('backups');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  if (lstatSync(root).isSymbolicLink()) throw new OperationError('Backup directories cannot be symbolic links.');
  const dir = resolve(input);
  if (dirname(dir) !== root || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(basename(dir))) {
    throw new OperationError('Use a unique directory directly inside the ignored backups folder.');
  }
  execFileSync('git', ['check-ignore', '--quiet', dir], { stdio: 'ignore', windowsHide: true });
  if (create) mkdirSync(dir, { mode: 0o700 });
  if (!lstatSync(dir).isDirectory() || lstatSync(dir).isSymbolicLink()) throw new OperationError('Backup directory must be a real private directory.');
  return realpathSync(dir);
}

async function checksum(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function databaseIdentity(pool) {
  const { rows } = await pool.query(`SELECT current_database() AS database, inet_server_addr()::text AS address,
    inet_server_port() AS port, (SELECT oid::text FROM pg_database WHERE datname = current_database()) AS oid`);
  return createHash('sha256').update(JSON.stringify(rows[0])).digest('hex');
}

async function postgresClient(url, major, directory, program, args) {
  const image = `postgres:${major}-alpine`;
  try { execFileSync('docker', ['image', 'inspect', image], { stdio: 'ignore', windowsHide: true }); }
  catch {
    try { execFileSync('docker', ['pull', image], { stdio: 'pipe', windowsHide: true }); }
    catch { throw new OperationError('The matching official Postgres client image is unavailable. Check Docker.'); }
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const linuxLocal = process.platform === 'linux' && local;
  const host = linuxLocal ? url.hostname.replace(/^\[|\]$/g, '') : local ? 'host.docker.internal' : url.hostname;
  const env = { ...process.env, PGHOST: host,
    PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username), ['PGPASSWORD']: decodeURIComponent(url.password),
    PGSSLMODE: local ? (url.searchParams.get('sslmode') || 'disable') : 'verify-full',
    PGSSLROOTCERT: local ? '' : 'system', PGCONNECT_TIMEOUT: '10',
  };
  const keys = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGSSLMODE', 'PGSSLROOTCERT', 'PGCONNECT_TIMEOUT'];
  const dockerArgs = ['run', '--rm', '--pull', 'never', ...(process.platform === 'linux' ? ['--user', `${process.getuid()}:${process.getgid()}`] : []),
    ...(linuxLocal ? ['--network', 'host'] : []),
    ...keys.flatMap(key => ['--env', key]), '--mount', `type=bind,source=${directory},target=/backup${program === 'pg_restore' ? ',readonly' : ''}`,
    image, program, '--no-password', ...args];
  await new Promise((resolve, reject) => {
    const child = spawn('docker', dockerArgs, { env, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let diagnostics = '';
    child.stderr.on('data', value => { diagnostics = (diagnostics + value).slice(-8192); });
    child.on('error', () => reject(new OperationError('Could not start the Postgres client. Private values are hidden.')));
    child.on('exit', code => {
      if (code === 0 && !diagnostics) return resolve();
      const category = ['snapshot', 'authentication', 'connection', 'mount', 'permission', 'certificate', 'version', 'schema', 'service']
        .find(name => diagnostics.toLowerCase().includes(name)) || 'client';
      reject(new OperationError(`Postgres ${program} failed or reported diagnostics (${category}). Private values are hidden.`));
    });
  });
}

async function hasSchema(pool) {
  const { rows } = await pool.query("SELECT count(*)::int AS count FROM pg_namespace WHERE nspname IN ('qrconnect', 'qrconnect_migrations')");
  return rows[0].count > 0;
}

async function requireEmptyTarget(pool) {
  if (await hasSchema(pool)) throw new OperationError('Target is already initialized; existing application schemas are never overwritten.');
  const { rows } = await pool.query("SELECT count(*)::int AS count FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace WHERE nspname = 'public' AND relkind IN ('r', 'p', 'v', 'm', 'f', 'S')");
  if (rows[0].count) throw new OperationError('Target contains existing public tables or other data objects; use a new empty application database.');
}

async function inspect(pool, environment) {
  if (!await hasSchema(pool)) return { environment, initialized: false, counts: null };
  const counts = {};
  for (const name of tables) {
    const { rows } = await pool.query(`SELECT count(*)::text AS count FROM qrconnect."${name}"`);
    counts[name] = rows[0].count;
  }
  const { rows } = await pool.query('SELECT count(*)::text AS count FROM qrconnect_migrations.__drizzle_migrations');
  counts.migrations = rows[0].count;
  const rls = await pool.query("SELECT relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace WHERE nspname = 'qrconnect' AND relkind = 'r'");
  return { environment, initialized: true, counts, rowSecurityEnabled: rls.rows.length === tables.length && rls.rows.every(row => row.relrowsecurity) };
}

let pool;
try {
  const { values, positionals } = parseArgs({ options: {
    config: { type: 'string' }, environment: { type: 'string' }, out: { type: 'string' }, from: { type: 'string' },
  }, allowPositionals: true });
  if (positionals.length !== 1 || !['inspect', 'prepare', 'backup', 'restore'].includes(positionals[0])) {
    throw new OperationError('Choose inspect, prepare, backup or restore.');
  }
  if (!values.config || !['local', 'staging', 'production', 'restore'].includes(values.environment)) {
    throw new OperationError('Provide a private config and an explicit environment.');
  }
  const configPath = realpathSync(values.config);
  execFileSync('git', ['check-ignore', '--quiet', configPath], { stdio: 'ignore', windowsHide: true });
  const config = parse(readFileSync(configPath));
  if (config.OPERATIONS_ENVIRONMENT !== values.environment) throw new OperationError('Configured environment does not match the requested environment.');
  const url = new URL(config.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) throw new OperationError('Configure a private Postgres connection.');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (values.environment === 'local' && !loopback) throw new OperationError('The local environment requires localhost.');
  if (!loopback && url.searchParams.get('sslmode') !== 'verify-full') throw new OperationError('Remote database operations require verified TLS.');
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(decodeURIComponent(url.pathname.slice(1))) || [...url.searchParams.keys()].some(key => key !== 'sslmode')) {
    throw new OperationError('Use a direct or session Postgres connection with only the sslmode query option.');
  }
  pool = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 10000 });
  pool.on('error', () => {}); // Never emit raw provider errors containing connection details.
  const command = positionals[0];
  if (command === 'prepare') {
    if (values.environment === 'restore') throw new OperationError('Use restore for a recovery environment.');
    const origin = new URL(config.APP_URL);
    if (origin.origin !== config.APP_URL || (values.environment !== 'local' && origin.protocol !== 'https:')) throw new OperationError('Configure the exact application origin, using HTTPS for staging and production.');
    if (!config.BETTER_AUTH_SECRET || config.BETTER_AUTH_SECRET.length < 32) throw new OperationError('Configure a private session secret of at least 32 characters.');
    await requireEmptyTarget(pool);
    try {
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/migrate.ts'], { env: {
        ...process.env, ...config, DATABASE_URL: url.toString(), DATABASE_MIGRATION_URL: url.toString(),
      }, stdio: 'pipe', windowsHide: true });
    } catch { throw new OperationError('Database preparation failed. Private values are hidden.'); }
  } else if (command === 'backup') {
    const directory = backupDirectory(values.out, true);
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const state = await inspect(client, values.environment);
      if (!state.initialized || !state.rowSecurityEnabled) throw new OperationError('Backup requires a complete application schema with row security enabled.');
      const { rows } = await client.query("SELECT pg_export_snapshot() AS snapshot, current_setting('server_version_num')::int AS version");
      const major = Math.floor(rows[0].version / 10000);
      const identity = await databaseIdentity(client);
      await postgresClient(url, major, directory, 'pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--strict-names',
        '--schema=qrconnect', '--schema=qrconnect_migrations', `--snapshot=${rows[0].snapshot}`, '--file=/backup/database.dump']);
      const file = join(directory, 'database.dump');
      chmodSync(file, 0o600);
      const manifest = { version: 1, application: 'qrconnect', environment: values.environment, createdAt: new Date().toISOString(),
        major, identity, counts: state.counts, sha256: await checksum(file) };
      writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      await client.query('COMMIT');
    } finally { await client.query('ROLLBACK').catch(() => {}); client.release(); }
  } else if (command === 'restore') {
    if (values.environment !== 'restore') throw new OperationError('Restore requires a separate recovery environment explicitly named restore.');
    const directory = backupDirectory(values.from);
    const file = join(directory, 'database.dump');
    const manifestFile = join(directory, 'manifest.json');
    for (const path of [file, manifestFile]) {
      if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new OperationError('Backup files must be regular private files.');
    }
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    if (manifest.version !== 1 || manifest.application !== 'qrconnect' || !Number.isInteger(manifest.major) || manifest.major < 14 || manifest.major > 99 ||
      !/^[a-f0-9]{64}$/.test(manifest.identity) || manifest.sha256 !== await checksum(file)) throw new OperationError('Backup integrity validation failed before restore.');
    if (await databaseIdentity(pool) === manifest.identity) throw new OperationError('Restore refuses the original source database.');
    await requireEmptyTarget(pool);
    const { rows } = await pool.query("SELECT current_setting('server_version_num')::int AS version");
    const major = Math.floor(rows[0].version / 10000);
    if (major !== manifest.major) throw new OperationError('This recovery procedure requires matching Postgres major versions.');
    await postgresClient(url, major, directory, 'pg_restore', ['--single-transaction', '--exit-on-error', '--no-owner', '--no-acl',
      '--dbname', decodeURIComponent(url.pathname.slice(1)), '/backup/database.dump']);
    const state = await inspect(pool, values.environment);
    if (!state.rowSecurityEnabled || JSON.stringify(state.counts) !== JSON.stringify(manifest.counts)) throw new OperationError('Restored data verification failed; keep the recovery target isolated.');
  }
  console.log(JSON.stringify(await inspect(pool, values.environment)));
} catch (error) {
  console.error(error instanceof OperationError ? error.message : 'Database operation failed. Private values are hidden.');
  process.exitCode = 1;
} finally { await pool?.end(); }
