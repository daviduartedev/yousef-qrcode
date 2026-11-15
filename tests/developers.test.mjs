import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockedAddress } from '../src/lib/developers.ts';

test('webhooks never reach private, loopback, link-local or reserved addresses', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.0.10', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1',
    '::1', '::', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1', '198.18.0.1', '::ffff:7f00:1', '::127.0.0.1', '2002:c0a8:1::1', '2002::1', 'fec0::1', '100::1', '2001:0:4136::1']) assert.equal(blockedAddress(address), true, address);
  for (const address of ['8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111', '::ffff:1.1.1.1', '2002:808:808::1']) assert.equal(blockedAddress(address), false, address);
});
