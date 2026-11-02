import 'server-only';

export function getServerEnv() {
  const databaseUrl = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const appUrl = process.env.APP_URL;
  if (!databaseUrl || !secret || secret.length < 32 || !appUrl) {
    throw new Error('Private server configuration is missing or invalid.');
  }
  let database: URL;
  let origin: URL;
  try { database = new URL(databaseUrl); origin = new URL(appUrl); }
  catch { throw new Error('Private server configuration is invalid.'); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/') {
    throw new Error('Private server configuration is invalid.');
  }
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) {
    throw new Error('Production application origin must use HTTPS.');
  }
  return { databaseUrl, secret, appUrl: origin.origin, trustProxyHeaders: process.env.TRUST_PROXY_HEADERS === 'true' };
}
