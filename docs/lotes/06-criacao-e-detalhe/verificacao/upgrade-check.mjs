// Proves migration 0005 upgrades a database created with 0000–0004 and existing rows.
// Usage: node docs/lotes/06-criacao-e-detalhe/verificacao/upgrade-check.mjs postgresql://postgres@127.0.0.1:55432/postgres
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const admin = new URL(process.argv[2]);
if (!['127.0.0.1', 'localhost'].includes(admin.hostname)) throw new Error('localhost only');
const name = 'qrconnect_upgrade_' + randomUUID().replaceAll('-', '');
const adminPool = new Pool({ connectionString: admin.toString(), max: 1 });
await adminPool.query(`CREATE DATABASE "${name}"`);
const url = new URL(admin); url.pathname = '/' + name;
const pool = new Pool({ connectionString: url.toString(), max: 1 });
const previous = mkdtempSync(resolve('.scratch/upgrade-migrations-'));
try {
  cpSync('drizzle', previous, { recursive: true });
  for (const file of readdirSync(previous)) if (file.startsWith('0005_')) rmSync(join(previous, file));
  rmSync(join(previous, 'meta', '0005_snapshot.json'), { force: true });
  const journal = JSON.parse(readFileSync(join(previous, 'meta', '_journal.json'), 'utf8'));
  journal.entries = journal.entries.filter(entry => entry.idx < 5);
  writeFileSync(join(previous, 'meta', '_journal.json'), JSON.stringify(journal));
  const options = { migrationsSchema: 'qrconnect_migrations' };
  await migrate(drizzle(pool), { ...options, migrationsFolder: previous });
  const userId = randomUUID(), qrId = randomUUID();
  await pool.query('INSERT INTO qrconnect."user" (id, name, email) VALUES ($1, $2, $3)', [userId, 'Upgrade fixture', 'upgrade@example.test']);
  await pool.query(`INSERT INTO qrconnect.qr_codes (id, user_id, short_code, destination_url, qr_type, total_scans)
    VALUES ($1, $2, 'legacy-code', 'https://example.test/legacy', 'qrGenerator.tabs.website', 3)`, [qrId, userId]);
  await pool.query('INSERT INTO qrconnect.qr_scans (qr_code_id) VALUES ($1), ($1), ($1)', [qrId]);
  await migrate(drizzle(pool), { ...options, migrationsFolder: './drizzle' });
  const { rows: [row] } = await pool.query('SELECT short_code, destination_url, qr_type, content, total_scans, tracking_enabled FROM qrconnect.qr_codes');
  const { rows: [{ scans }] } = await pool.query('SELECT count(*)::int AS scans FROM qrconnect.qr_scans');
  const { rows: [{ history }] } = await pool.query('SELECT count(*)::int AS history FROM qrconnect.qr_destination_changes');
  const { rows: [{ rls }] } = await pool.query(`SELECT relrowsecurity AS rls FROM pg_class WHERE relname = 'qr_destination_changes'`);
  const { rows: [{ migrations }] } = await pool.query('SELECT count(*)::int AS migrations FROM qrconnect_migrations.__drizzle_migrations');
  // Old application code selects every column it knows; the new nullable column must not break it.
  await pool.query(`INSERT INTO qrconnect.qr_codes (user_id, short_code, destination_url) VALUES ($1, 'old-client', 'https://example.test/old')`, [userId]);
  const ok = row.short_code === 'legacy-code' && row.content === null && row.total_scans === 3 && scans === 3 && history === 0 && rls === true && migrations === 6;
  console.log(JSON.stringify({ row, scans, history, rls, migrations, ok }));
  if (!ok) process.exitCode = 1;
} finally {
  await pool.end();
  await adminPool.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await adminPool.end();
  rmSync(previous, { recursive: true, force: true });
}
