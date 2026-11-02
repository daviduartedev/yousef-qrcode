import 'server-only';
import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '@/server/db';
import * as schema from '@/server/db/schema';
import { getServerEnv } from '@/server/env';

function createAuth() {
  const env = getServerEnv();
  return betterAuth({
    baseURL: env.appUrl,
    secret: env.secret,
    trustedOrigins: [env.appUrl],
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    advanced: { database: { generateId: () => randomUUID() }, ipAddress: { disableIpTracking: !env.trustProxyHeaders } },
    logger: { disabled: true },
  });
}
let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return auth ??= createAuth(); }
