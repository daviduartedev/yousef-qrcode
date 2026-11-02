import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (args, options = {}) => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024, ...options });
const forbidden = name => /(^|\/)\.env(?:\.|$)/i.test(name) && !/(^|\/)\.env\.example$/.test(name);
const findings = new Set();
const patterns = [
  ['credential-url', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:'"<>]+:([^\s@'"<>]+)@[^\s'"<>]+/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['provider-token', /\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}|sk[-_](?:proj[-_]|live_|test_)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{30,})\b/g],
  ['jwt-token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ['secret-assignment', /\b(?:[A-Z_]*(?:PASSWORD|SECRET|PRIVATE_KEY|ACCESS_TOKEN|API_KEY))["']?\s*[:=]\s*["']?([^\s"'`,;}{]{12,})/g],
  ['private-key-file', /\bNEXT_PUBLIC_[A-Z_]*(?:DATABASE|PASSWORD|SECRET|PRIVATE_KEY|SERVICE_ROLE|ACCESS_TOKEN|API_KEY)\b/g],
];
const placeholder = value => /^(?:USER|PASSWORD|HOST|REPLACE_[A-Z_]+|YOUR_[A-Z_]+|\$\{|process\.|env\.)/.test(value);
function scan(name, content) {
  if (forbidden(name)) findings.add(`environment-file: ${name}`);
  if (/\.(?:pem|key|p12|pfx)$/i.test(name)) findings.add(`private-key-file: ${name}`);
  if (content.includes(0)) return;
  const body = content.toString('utf8');
  for (const [rule, regex] of patterns) {
    for (const match of body.matchAll(regex)) {
      if (match[1] && placeholder(match[1])) continue;
      findings.add(`${rule}: ${name}:${body.slice(0, match.index).split('\n').length}`);
    }
  }
}

try {
  const staged = process.argv.includes('--staged');
  const names = git(staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    .toString().split('\0').filter(Boolean);
  for (const name of new Set(names)) {
    const content = staged ? git(['show', `:${name}`]) : readFileSync(name);
    scan(name, content);
  }
  if (process.argv.includes('--history')) {
    const objects = git(['rev-list', '--objects', '--all']).toString().trim().split('\n').filter(Boolean).map(line => {
      const at = line.indexOf(' ');
      return { hash: at < 0 ? line : line.slice(0, at), name: at < 0 ? '' : line.slice(at + 1) };
    });
    const batch = git(['cat-file', '--batch'], { input: objects.map(o => o.hash).join('\n') + '\n' });
    let offset = 0;
    for (const object of objects) {
      const end = batch.indexOf(10, offset);
      const [, type, length] = batch.subarray(offset, end).toString().split(' ');
      const size = Number(length);
      const content = batch.subarray(end + 1, end + 1 + size);
      offset = end + 1 + size + 1;
      if (type === 'blob') scan(object.name, content);
    }
  }
  if (findings.size) {
    console.error('Credential protection rejected the following files/rules (values hidden):');
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  } else console.log('Credential protection passed.');
} catch {
  console.error('Credential protection could not inspect the repository. No values were printed.');
  process.exitCode = 1;
}
