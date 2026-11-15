import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestedPath, safeReturnPath, signInPath } from '../src/lib/auth-paths.ts';

test('only same-site workspace paths are accepted as the sign-in return address', () => {
  assert.equal(safeReturnPath('/analytics?qr=1#top'), '/analytics?qr=1#top');
  assert.equal(safeReturnPath('/my-qrcodes?q=caf%C3%A9'), '/my-qrcodes?q=caf%C3%A9');
  for (const unsafe of ['https://evil.example/', '//evil.example/x', '/\\evil.example', '\\\\evil.example', 'javascript:alert(1)',
    '/\t/evil.example', '/auth', '/auth/reset-password?token=x', '/api/auth/sign-out', '', null, undefined, 'overview', '/' + 'a'.repeat(600)]) {
    assert.equal(safeReturnPath(unsafe), '/overview', String(unsafe));
  }
  assert.equal(safeReturnPath('/\t/evil.example'), '/overview');
  assert.equal(safeReturnPath('https://evil.example/', ''), '');
});

test('private pages build a sign-in link that brings the visitor back', () => {
  assert.equal(signInPath(), '/auth');
  assert.equal(signInPath('/overview'), '/auth?next=%2Foverview');
  assert.equal(signInPath(requestedPath('/app', { edit: 'abc', list: ['x', 'y'] })), '/auth?next=%2Fapp%3Fedit%3Dabc');
  assert.equal(signInPath('//evil.example'), '/auth');
  assert.equal(signInPath(undefined, 'signup'), '/auth?mode=signup');
});
