import { execFileSync } from 'node:child_process';
try {
  execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks']);
  console.log('Repository credential hooks installed.');
} catch {
  console.log('Git hooks unavailable outside a Git checkout.');
}
