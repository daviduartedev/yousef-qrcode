import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAssetName, formatBytes, imageDimensions, sniffAssetType } from '../src/lib/assets.ts';

const png = (width, height) => {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
};

test('file types come from the content signature, never from the name', () => {
  assert.equal(sniffAssetType(png(1, 1)), 'image/png');
  assert.equal(sniffAssetType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(sniffAssetType(new TextEncoder().encode('GIF89a......')), 'image/gif');
  assert.equal(sniffAssetType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(sniffAssetType(new TextEncoder().encode('%PDF-1.7\n')), 'application/pdf');
  for (const text of ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', '<html>', 'MZ\x90\x00', '']) {
    assert.equal(sniffAssetType(new TextEncoder().encode(text)), null, text);
  }
});

test('image dimensions are read from headers', () => {
  assert.deepEqual(imageDimensions(png(640, 480), 'image/png'), { width: 640, height: 480 });
  const gif = new TextEncoder().encode('GIF89a\x20\x00\x10\x00');
  assert.deepEqual(imageDimensions(gif, 'image/gif'), { width: 32, height: 16 });
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 50, 0, 100, 3, 0, 0, 0]);
  assert.deepEqual(imageDimensions(jpeg, 'image/jpeg'), { width: 100, height: 50 });
  assert.equal(imageDimensions(png(1, 1).slice(0, 12), 'image/png'), null);
});

test('file names are labels without paths or control characters', () => {
  assert.equal(cleanAssetName('  ../../etc/passwd  '), '....etcpasswd');
  assert.equal(cleanAssetName('شعار\u0000.png'), 'شعار.png');
  assert.equal(cleanAssetName('   '), null);
  assert.equal(Array.from(cleanAssetName('a'.repeat(300))).length, 120);
  assert.equal(formatBytes(1536), '1.5 KB');
});
