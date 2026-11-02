import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getServerEnv } from '@/server/env';
import * as schema from './schema';

const globalDb = globalThis as unknown as { qrPool?: Pool };
export function getDb() {
  const pool = globalDb.qrPool ??= new Pool({
    connectionString: getServerEnv().databaseUrl,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  return drizzle(pool, { schema });
}
