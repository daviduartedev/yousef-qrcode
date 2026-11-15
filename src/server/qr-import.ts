import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { qrImportMaxBytes, readQRImport, type QRImportResult } from "@/lib/qr-import";
import { HttpError } from "@/server/http";
import { createCode } from "@/server/qr-codes";

async function readCsv(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "text/csv") throw new HttpError(415, "CSV content required");
  if (Number(request.headers.get("content-length")) > qrImportMaxBytes) {
    throw new HttpError(413, "CSV file is too large");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "CSV file required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > qrImportMaxBytes) {
      await reader.cancel();
      throw new HttpError(413, "CSV file is too large");
    }
    chunks.push(value);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new HttpError(400, "CSV must be encoded in UTF-8");
  }
}

function importRecordId(batchHash: Buffer, line: number) {
  // Scope the stable record identifier to this account, file, submission, and line.
  const bytes = createHash("sha256").update(batchHash).update(String(line)).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export async function importQrCodes(userId: string, request: Request): Promise<QRImportResult> {
  const importId = z.uuid().safeParse(request.headers.get("x-qr-import-id"));
  if (!importId.success) throw new HttpError(400, "Invalid import identifier");
  const csv = await readCsv(request);
  const preview = readQRImport(csv);
  if ("issue" in preview) {
    throw new HttpError(preview.issue === "too_many_rows" ? 413 : 400, preview.issue);
  }

  const batchHash = createHash("sha256")
    .update(userId).update("\0").update(importId.data.toLowerCase()).update("\0").update(csv)
    .digest();
  const rows: QRImportResult["rows"] = [];
  // Keep each import below the existing connection-pool size.
  const concurrency = 4;
  for (let index = 0; index < preview.rows.length; index += concurrency) {
    const slice = preview.rows.slice(index, index + concurrency);
    const results = await Promise.all(slice.map(async (row): Promise<QRImportResult["rows"][number]> => {
      if ("issue" in row) return { line: row.line, status: "invalid", issue: row.issue };
      try {
        const { qrCode } = await createCode(userId, {
          title: row.title,
          destination_url: row.destination,
          qr_type: "website",
          tracking_enabled: row.mode === "tracked",
        }, { recordId: importRecordId(batchHash, row.line) });
        return { line: row.line, status: "created", id: qrCode.id };
      } catch {
        return { line: row.line, status: "failed" };
      }
    }));
    rows.push(...results);
  }
  let created = 0, invalid = 0, failed = 0;
  for (const row of rows) {
    if (row.status === "created") created++;
    else if (row.status === "invalid") invalid++;
    else failed++;
  }
  if (failed) console.error("One or more QR import rows could not be saved. Private details are suppressed.");
  return { rows, created, invalid, failed };
}
