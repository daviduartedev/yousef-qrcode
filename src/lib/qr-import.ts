import { safeDestination } from "./qr-destination";

export const qrImportMaxRows = 50;
export const qrImportMaxBytes = 128 * 1024;
export const qrImportTemplate = [
  "title,destination_url,mode",
  "Product guide,https://example.com/guide,direct",
  "Spring campaign,https://example.com/spring,tracked",
].join("\r\n") + "\r\n";

// The existing QR renderer uses byte mode with error correction level H.
const maxDirectQrBytes = 1273;
const csvColumns = ["title", "destination_url", "mode"] as const;

export type QRImportFileIssue = "invalid_header" | "empty_file" | "too_many_rows";
export type QRImportRowIssue =
  | "invalid_csv"
  | "invalid_title"
  | "invalid_destination"
  | "invalid_mode"
  | "direct_destination_too_long";
type QRImportMode = "direct" | "tracked";

export type QRImportRow = {
  line: number;
  title: string;
  destination: string;
} & ({ issue: QRImportRowIssue } | { mode: QRImportMode });

export type QRImportResult = {
  rows: (
    | { line: number; status: "created"; id: string }
    | { line: number; status: "invalid"; issue: QRImportRowIssue }
    | { line: number; status: "failed" }
  )[];
  created: number;
  invalid: number;
  failed: number;
};

type CsvRecord = { line: number; fields: string[]; malformed: boolean };
type CsvState = "field" | "quoted" | "closed" | "malformed";

function* readRecords(csv: string): Generator<CsvRecord> {
  let state: CsvState = "field";
  let fields: string[] = [];
  let field = "";
  let line = 1;
  let recordLine = 1;

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index];
    const newline = character === "\r" || character === "\n";
    if (character === "\r" && csv[index + 1] === "\n") index++;

    if (state === "quoted") {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          state = "closed";
        }
      } else {
        field += newline ? "\n" : character;
        if (newline) line++;
      }
      continue;
    }

    if (newline) {
      yield { fields: [...fields, field], line: recordLine, malformed: state === "malformed" };
      state = "field";
      fields = [];
      field = "";
      line++;
      recordLine = line;
    } else if (state === "malformed") {
      continue;
    } else if (character === ",") {
      fields.push(field);
      field = "";
      state = "field";
    } else if (character === '"' && state === "field" && field === "") {
      state = "quoted";
    } else if (character === '"' || state === "closed") {
      state = "malformed";
    } else {
      field += character;
    }
  }

  if (fields.length || field || state !== "field") {
    yield {
      fields: [...fields, field],
      line: recordLine,
      malformed: state === "malformed" || state === "quoted",
    };
  }
}

function rowIssue(title: string, destination: string, mode: string): QRImportRowIssue | undefined {
  if (!title || title.includes("\0") || Array.from(title).length > 255) return "invalid_title";
  if (destination.length > 2048 || !safeDestination(destination)) return "invalid_destination";
  if (mode !== "direct" && mode !== "tracked") return "invalid_mode";
  if (mode === "direct" && new TextEncoder().encode(new URL(destination).href).length > maxDirectQrBytes) {
    return "direct_destination_too_long";
  }
}

export function readQRImport(csv: string): { rows: QRImportRow[] } | { issue: QRImportFileIssue } {
  if (!csv.trim()) return { issue: "empty_file" };
  const records = readRecords(csv.replace(/^\uFEFF/, ""));
  const firstRecord = records.next();
  if (firstRecord.done) return { issue: "empty_file" };
  const header = firstRecord.value;
  const columns = header.fields.map(field => field.trim().toLowerCase());
  const titleColumn = columns.indexOf("title");
  const destinationColumn = columns.indexOf("destination_url");
  const modeColumn = columns.indexOf("mode");
  if (header.malformed || titleColumn < 0 || destinationColumn < 0
    || columns.length !== (modeColumn < 0 ? 2 : 3)
    || !columns.every(field => csvColumns.some(column => column === field))) {
    return { issue: "invalid_header" };
  }

  const rows: QRImportRow[] = [];
  for (const { fields, line, malformed } of records) {
    if (!malformed && fields.length === 1 && fields[0].trim() === "") continue;
    if (rows.length === qrImportMaxRows) return { issue: "too_many_rows" };

    const title = fields[titleColumn]?.trim() ?? "";
    const destination = fields[destinationColumn]?.trim() ?? "";
    const mode = fields[modeColumn]?.trim().toLowerCase() || "tracked";
    const issue = malformed || fields.length !== columns.length
      ? "invalid_csv"
      : rowIssue(title, destination, mode);

    // Bound the preview text of invalid rows too.
    const display = { line, title: title.slice(0, 512), destination: destination.slice(0, 2048) };
    if (issue) {
      rows.push({ ...display, issue });
    } else {
      rows.push({ line, title, destination, mode: mode === "direct" ? "direct" : "tracked" });
    }
  }
  return rows.length ? { rows } : { issue: "empty_file" };
}
