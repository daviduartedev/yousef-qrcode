import qrcode from "qrcode-generator";

export const errorCorrectionLevels = ["L", "M", "Q", "H"] as const;
export type ErrorCorrectionLevel = (typeof errorCorrectionLevels)[number];

/**
 * qrcode-generator keeps only the low byte of each UTF-16 unit in Byte mode.
 * Passing UTF-8 bytes as a binary string keeps ASCII payloads identical and
 * makes Arabic and other non-Latin text decode correctly.
 */
export function utf8Binary(value: string) {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return binary;
}

export function qrMatrix(data: string, level: ErrorCorrectionLevel = "H"): boolean[][] | null {
  if (!data) return null;
  try {
    const qr = qrcode(0, level);
    qr.addData(utf8Binary(data), "Byte");
    qr.make();
    const count = qr.getModuleCount();
    return Array.from({ length: count }, (_, row) =>
      Array.from({ length: count }, (_, column) => qr.isDark(row, column)),
    );
  } catch {
    return null;
  }
}

/** Modules hidden behind a centered logo, matching the rendered preview. */
export function logoArea(count: number) {
  const size = Math.max(3, Math.floor(count * 0.15));
  const start = Math.floor((count - size) / 2);
  return { start: start - 1, end: start + size };
}

/** Logos remove modules, so only the stronger levels stay readable. */
export const allowedErrorCorrection = (hasLogo: boolean): readonly ErrorCorrectionLevel[] =>
  hasLogo ? ["Q", "H"] : errorCorrectionLevels;
