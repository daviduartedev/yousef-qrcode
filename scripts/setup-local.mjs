import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';

if (existsSync('.env.local')) {
  console.log('Existing .env.local preserved. Run npm run db:up, then npm run db:migrate.');
} else {
  execFileSync('git', ['check-ignore', '--quiet', '.env.local']);
  const freePort = preferred => new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', () => {
      const fallback = createServer();
      fallback.on('error', reject);
      fallback.listen(0, '127.0.0.1', () => { const port = fallback.address().port; fallback.close(() => resolve(port)); });
    });
    server.listen(preferred, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  const dbPort = await freePort(54329);
  const appPort = await freePort(3000);
  const password = randomBytes(32).toString('hex');
  const secret = randomBytes(48).toString('base64url');
  writeFileSync('.env.local', [
    `DATABASE_URL=postgresql://qrconnect:${password}@127.0.0.1:${dbPort}/qrconnect`,
    `POSTGRES_PASSWORD=${password}`, `POSTGRES_PORT=${dbPort}`,
    `BETTER_AUTH_SECRET=${secret}`, `APP_URL=http://localhost:${appPort}`,
    'TRUST_PROXY_HEADERS=false', '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  console.log(`Created ignored local configuration. App URL: http://localhost:${appPort}. Credentials are not printed.`);
}
