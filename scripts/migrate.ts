import { config } from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

config({ path: '.env.local', quiet: true });
const connectionString = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set a private database connection before running migrations.');
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });
try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle', migrationsSchema: 'qrconnect_migrations' });
  console.log('Database migrations applied.');
} catch {
  console.error('Database migration failed. Check the private connection and database availability. Values are hidden.');
  process.exitCode = 1;
} finally { await pool.end(); }
