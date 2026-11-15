import 'server-only';
import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '@/server/db';
import * as schema from '@/server/db/schema';
import { getServerEnv } from '@/server/env';
import { after } from 'next/server';
import { emailDeliveryAvailable, sendAccountEmail, type AccountEmail } from '@/server/email';

// Delivery runs after the response so its duration never distinguishes existing accounts.
const deliverLater = (userId: string, message: AccountEmail) => { after(() => sendAccountEmail(userId, message)); };

function createAuth() {
  const env = getServerEnv();
  // A misconfigured transport turns account email off instead of breaking sign-in.
  const email = emailDeliveryAvailable();
  return betterAuth({
    baseURL: env.appUrl,
    secret: env.secret,
    trustedOrigins: [env.appUrl],
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Recovery is only offered when a delivery channel exists; the reset ends every other session.
      ...(email ? {
        resetPasswordTokenExpiresIn: 60 * 60,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => deliverLater(user.id, { kind: 'reset-password', to: user.email, url }),
      } : {}),
    },
    ...(email ? {
      emailVerification: {
        sendOnSignUp: true,
        // Opening the link only confirms the address; it never signs the reader into an account they may not own.
        autoSignInAfterVerification: false,
        expiresIn: 60 * 60 * 24,
        sendVerificationEmail: async ({ user, url }) => deliverLater(user.id, { kind: 'verify-email', to: user.email, url }),
      },
    } : {}),
    advanced: { database: { generateId: () => randomUUID() }, ipAddress: { disableIpTracking: !env.trustProxyHeaders } },
    logger: { disabled: true },
  });
}
let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return auth ??= createAuth(); }
