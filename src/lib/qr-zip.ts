// Store files without compression. QR PNGs are compressed already, and batches are small.
const localHeaderLength = 30;
const centralHeaderLength = 46;
const utf8Flag = 1 << 11;
const dosDate = (1 << 5) | 1; // 1980-01-01, the earliest ZIP timestamp
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function fileHeader(length: number, signature: number, crc: number, size: number, nameSize: number) {
  const header = new DataView(new ArrayBuffer(length));
  const metadata = length === centralHeaderLength ? 2 : 0;
  header.setUint32(0, signature, true);
  header.setUint16(4 + metadata, 20, true);
  header.setUint16(6 + metadata, utf8Flag, true);
  header.setUint16(12 + metadata, dosDate, true);
  header.setUint32(14 + metadata, crc, true);
  header.setUint32(18 + metadata, size, true);
  header.setUint32(22 + metadata, size, true);
  header.setUint16(26 + metadata, nameSize, true);
  return header;
}

export async function makeQRArchive(entries: ReadonlyArray<{ name: string; image: Blob }>) {
  const files: BlobPart[] = [];
  const directory: BlobPart[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  let directorySize = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const bytes = new Uint8Array(await entry.image.arrayBuffer());
    const crc = crc32(bytes);
    const local = fileHeader(localHeaderLength, 0x04034b50, crc, bytes.byteLength, name.byteLength);
    const central = fileHeader(centralHeaderLength, 0x02014b50, crc, bytes.byteLength, name.byteLength);
    central.setUint16(4, 20, true);
    central.setUint32(42, offset, true);
    files.push(local.buffer, name, bytes);
    directory.push(central.buffer, name);
    offset += localHeaderLength + name.byteLength + bytes.byteLength;
    directorySize += centralHeaderLength + name.byteLength;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return new Blob([...files, ...directory, end.buffer], { type: "application/zip" });
}
