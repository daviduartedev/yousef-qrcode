import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { getServerEnv } from '@/server/env';
import { getDb } from '@/server/db';
import { accountEmailDispatches } from '@/server/db/schema';

export type AccountEmail = { kind: 'reset-password' | 'verify-email'; to: string; url: string };

/** Per account and kind: at most 3 messages in 15 minutes and 10 in a day. */
export const emailLimits = { shortWindowMinutes: 15, shortWindowMax: 3, dayMax: 10 } as const;

type Transport = { name: 'outbox' | 'resend'; send(message: AccountEmail): Promise<void> };

const content = {
  'reset-password': {
    subject: 'Reset your QRConnect password · إعادة تعيين كلمة مرور QRConnect',
    en: 'Someone asked to reset the password of your QRConnect account. Open this link within one hour to choose a new password. If it was not you, ignore this email.',
    ar: 'طلب أحدهم إعادة تعيين كلمة مرور حسابك في QRConnect. افتح هذا الرابط خلال ساعة واحدة لاختيار كلمة مرور جديدة. إذا لم تكن أنت، فتجاهل هذه الرسالة.',
  },
  'verify-email': {
    subject: 'Confirm your QRConnect email · تأكيد بريدك في QRConnect',
    en: 'Confirm the email address of your QRConnect account by opening this link. If you did not create this account, ignore this email.',
    ar: 'أكّد عنوان البريد الإلكتروني لحسابك في QRConnect بفتح هذا الرابط. إذا لم تنشئ هذا الحساب، فتجاهل هذه الرسالة.',
  },
} as const;

/** Bilingual body: the server does not know the reader's language when the message is sent. */
export function renderAccountEmail(message: AccountEmail) {
  const copy = content[message.kind];
  const text = `${copy.en}\n\n${message.url}\n\n---\n\n${copy.ar}\n\n${message.url}\n`;
  const escape = (value: string) => value.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
  const link = `<p><a href="${escape(message.url)}">${escape(message.url)}</a></p>`;
  const html = `<div lang="en" dir="ltr"><p>${escape(copy.en)}</p>${link}</div><hr><div lang="ar" dir="rtl"><p>${escape(copy.ar)}</p>${link}</div>`;
  return { subject: copy.subject, text, html };
}

function localOrigin(appUrl: string) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(appUrl).hostname);
}

let cached: Transport | null | undefined;

/**
 * `outbox` writes messages to a private local folder and only runs on a loopback origin, for automated tests.
 * `resend` sends through the Resend HTTP API with a key kept in private server configuration.
 * Without either, account email is off and the screens say recovery is unavailable.
 */
export function emailTransport(): Transport | null {
  if (cached !== undefined) return cached;
  const env = getServerEnv();
  const choice = process.env.EMAIL_TRANSPORT;
  if (choice === 'outbox') {
    const directory = process.env.EMAIL_OUTBOX_DIR;
    if (!directory || !localOrigin(env.appUrl) || process.env.VERCEL) throw new Error('The local email outbox only runs on a loopback origin with a private folder.');
    return cached = {
      name: 'outbox',
      async send(message) {
        await mkdir(directory, { recursive: true });
        const file = path.join(directory, `${Date.now()}-${randomUUID()}.json`);
        await writeFile(file, JSON.stringify({ ...message, ...renderAccountEmail(message) }), { mode: 0o600 });
      },
    };
  }
  if (choice === 'resend') {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) throw new Error('Email delivery is selected but its private configuration is incomplete.');
    return cached = {
      name: 'resend',
      async send(message) {
        const body = renderAccountEmail(message);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from, to: [message.to], subject: body.subject, text: body.text, html: body.html }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Email delivery failed with status ${response.status}.`);
      },
    };
  }
  return cached = null;
}

export function emailDeliveryAvailable() {
  try { return emailTransport() !== null; }
  catch { console.error('Account email is turned off: its configuration is invalid.'); return false; }
}

/** Records the dispatch unless the account already reached its limit; serialized per account and kind. */
async function reserveDispatch(userId: string, kind: AccountEmail['kind']) {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId + ':' + kind}))`);
    const { rows } = await tx.execute<{ recent: number; day: number }>(sql`
      select count(*) filter (where created_at > now() - make_interval(mins => ${emailLimits.shortWindowMinutes}))::int as recent,
             count(*)::int as day
      from qrconnect.account_email_dispatches
      where user_id = ${userId} and kind = ${kind} and created_at > now() - interval '1 day'`);
    if (rows[0].recent >= emailLimits.shortWindowMax || rows[0].day >= emailLimits.dayMax) return false;
    await tx.insert(accountEmailDispatches).values({ userId, kind });
    return true;
  });
}

/**
 * Never throws into the auth flow and never delays its answer: callers schedule this after the response,
 * so neither failures nor delivery time reveal whether an address has an account.
 */
export async function sendAccountEmail(userId: string, message: AccountEmail) {
  try {
    const transport = emailTransport();
    if (!transport || !(await reserveDispatch(userId, message.kind))) return;
    await transport.send(message);
  } catch { console.error(`Account email (${message.kind}) could not be delivered.`); }
}
