import test from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { encodeQRContent, parseQRContent, maxPayloadBytes, describeQRDestination, qrTypeOf } from '../src/lib/qr-content.ts';
import { qrMatrix, logoArea, allowedErrorCorrection, errorCorrectionLevels } from '../src/lib/qr-matrix.ts';

// Rasterize the module matrix with a 4-module quiet zone, as the preview does.
function decode(matrix, { logo = false } = {}) {
  const count = matrix.length;
  const hole = logo ? logoArea(count) : null;
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7);
  const scale = 4;
  const size = (count + 8) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) {
    const hidden = hole && !finder(r, c) && r >= hole.start && r <= hole.end && c >= hole.start && c <= hole.end;
    if (!matrix[r][c] || hidden) continue;
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
      const index = (((r + 4) * scale + y) * size + (c + 4) * scale + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
    }
  }
  const result = jsQR(pixels, size, size, { inversionAttempts: 'dontInvert' });
  return result && new TextDecoder().decode(new Uint8Array(result.binaryData));
}

const samples = [
  [{ type: 'text', text: 'Hello QRConnect' }, 'Hello QRConnect'],
  [{ type: 'text', text: 'مرحبا بكم في كيو آر كونكت' }, 'مرحبا بكم في كيو آر كونكت'],
  [{ type: 'email', to: 'team@example.com', subject: 'Olá & bem-vindo', body: 'Linha 1\nمرحبا' },
    'mailto:team@example.com?subject=Ol%C3%A1%20%26%20bem-vindo&body=Linha%201%0A%D9%85%D8%B1%D8%AD%D8%A8%D8%A7'],
  [{ type: 'email', to: 'team@example.com' }, 'mailto:team@example.com'],
  [{ type: 'phone', number: '+55 (11) 4000-1234' }, 'tel:+551140001234'],
  [{ type: 'sms', number: '+971 50 123 4567', message: 'Hi; see you: 5pm' }, 'SMSTO:+971501234567:Hi; see you: 5pm'],
  [{ type: 'wifi', ssid: 'Cafe;Guest', security: 'WPA', password: 'p:a,s\\s"1' },
    'WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:a\\,s\\\\s\\"1;;'],
  [{ type: 'wifi', ssid: 'Open', security: 'nopass', hidden: true }, 'WIFI:T:nopass;S:Open;H:true;;'],
];

test('static QR content encodes the documented payload for each type', () => {
  for (const [input, payload] of samples) {
    const parsed = parseQRContent(input);
    assert.ok(parsed, `valid ${input.type}`);
    assert.equal(parsed.payload, payload);
    assert.equal(encodeQRContent(parsed.content), payload);
  }
});

test('every payload decodes back from the rendered matrix at each allowed level', () => {
  for (const [, payload] of samples) {
    for (const level of errorCorrectionLevels) assert.equal(decode(qrMatrix(payload, level)), payload, `${payload} at ${level}`);
    for (const level of allowedErrorCorrection(true)) assert.equal(decode(qrMatrix(payload, level), { logo: true }), payload, `${payload} with logo at ${level}`);
  }
  const url = 'https://example.com/campaign?utm_source=qr';
  for (const level of allowedErrorCorrection(true)) assert.equal(decode(qrMatrix(url, level), { logo: true }), url);
});

test('invalid or oversized content is rejected before encoding', () => {
  const invalid = [
    { type: 'text', text: '   ' },
    { type: 'text', text: 'x'.repeat(1001) },
    { type: 'email', to: 'not-an-email' },
    { type: 'email', to: 'a@example.com', subject: 'line\nbreak' },
    { type: 'phone', number: 'call me' },
    { type: 'phone', number: '12' },
    { type: 'sms', number: '+1 555', message: 'x'.repeat(501) },
    { type: 'wifi', ssid: '', security: 'WPA', password: 'secret' },
    { type: 'wifi', ssid: 'Home', security: 'WPA', password: '' },
    { type: 'wifi', ssid: 'Home', security: 'WPA', password: 'short7!' },
    { type: 'wifi', ssid: 'م'.repeat(17), security: 'nopass' },
    { type: 'wifi', ssid: 'Home', security: 'WPA2', password: 'secret' },
    { type: 'website', url: 'https://example.com' },
    { type: 'text', text: 'ok', extra: true },
    { type: 'text', text: 'bell\u0007' },
  ];
  for (const input of invalid) assert.equal(parseQRContent(input), null, JSON.stringify(input).slice(0, 80));
  // 1000 Arabic characters take 2000 UTF-8 bytes and exceed the H-level capacity.
  assert.equal(parseQRContent({ type: 'text', text: 'م'.repeat(1000) }), null);
  assert.ok(parseQRContent({ type: 'text', text: 'م'.repeat(maxPayloadBytes / 2) }));
});

test('legacy types map to website and Wi-Fi lists hide the password', () => {
  assert.equal(qrTypeOf('qrGenerator.tabs.pdf'), 'website');
  assert.equal(qrTypeOf('wifi'), 'wifi');
  const content = parseQRContent({ type: 'wifi', ssid: 'Office', security: 'WPA', password: 'hunter22' }).content;
  assert.equal(describeQRDestination({ qr_type: 'wifi', destination_url: 'WIFI:...', content }), 'Wi-Fi · Office');
});

test('new copy namespaces have the same keys in English and Arabic', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const name of ['creation', 'analytics']) {
    const en = JSON.parse(await readFile(new URL(`../src/locales/${name}.en.json`, import.meta.url), 'utf8'));
    const ar = JSON.parse(await readFile(new URL(`../src/locales/${name}.ar.json`, import.meta.url), 'utf8'));
    assert.deepEqual(Object.keys(ar).sort(), Object.keys(en).sort(), name);
    for (const [key, value] of Object.entries(ar)) assert.ok(value.trim(), `Arabic ${name} copy for ${key}`);
  }
});
