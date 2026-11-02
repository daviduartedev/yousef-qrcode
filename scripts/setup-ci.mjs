import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('This setup is for disposable CI runners only.');
writeFileSync('.env.local', [
  'DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres',
  `BETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}`,
  'APP_URL=http://localhost:3000', 'TRUST_PROXY_HEADERS=false', '',
].join('\n'), { mode: 0o600, flag: 'wx' });
console.log('Ephemeral CI configuration created; secret values hidden.');
