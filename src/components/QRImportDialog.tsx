"use client";

import { CircleAlert, CircleCheck, Download, FileUp, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  qrImportMaxBytes,
  qrImportTemplate,
  readQRImport,
  type QRImportFileIssue,
  type QRImportResult,
  type QRImportRow,
} from "@/lib/qr-import";
import { qrImportCopy } from "@/locales/qr-import";

type Draft = { file: File; importId: string; rows: QRImportRow[] };
type FileIssue = QRImportFileIssue | "file_too_large" | "invalid_encoding" | "unreadable";

const templateUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(qrImportTemplate);

export function QRImportDialog({ onImported }: { onImported: () => void }) {
  const { i18n } = useTranslation();
  const copy = i18n.resolvedLanguage === "ar" ? qrImportCopy.ar : qrImportCopy.en;
  const format = new Intl.NumberFormat(i18n.resolvedLanguage);
  const titleId = useId();
  const detailsId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const readVersion = useRef(0);
  const sending = useRef(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [result, setResult] = useState<QRImportResult | null>(null);
  const [fileIssue, setFileIssue] = useState<FileIssue | null>(null);
  const [networkIssue, setNetworkIssue] = useState(false);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (result) summaryHeading.current?.focus();
  }, [result]);

  function reset() {
    readVersion.current++;
    setDraft(null);
    setResult(null);
    setFileIssue(null);
    setNetworkIssue(false);
    setReading(false);
    if (fileInput.current) fileInput.current.value = "";
    trigger.current?.focus();
  }

  async function previewFile(file: File) {
    const version = ++readVersion.current;
    setDraft(null);
    setResult(null);
    setFileIssue(null);
    setNetworkIssue(false);
    setReading(false);
    if (file.size > qrImportMaxBytes) {
      setFileIssue("file_too_large");
      return;
    }
    setReading(true);
    try {
      const bytes = await file.arrayBuffer();
      if (version !== readVersion.current) return;
      let csv: string;
      try {
        csv = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        setFileIssue("invalid_encoding");
        return;
      }
      const preview = readQRImport(csv);
      if ("issue" in preview) {
        setFileIssue(preview.issue);
        return;
      }
      setDraft({ file, importId: crypto.randomUUID(), rows: preview.rows });
    } catch {
      if (version === readVersion.current) setFileIssue("unreadable");
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }

  async function importRows() {
    if (!draft || sending.current) return;
    sending.current = true;
    setNetworkIssue(false);
    setBusy(true);

    let outcome: QRImportResult;
    try {
      const response = await fetch("/api/qr-codes/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv;charset=UTF-8", "X-QR-Import-Id": draft.importId },
        body: draft.file,
      });
      if (!response.ok) throw new Error("Import response was unsuccessful");
      outcome = await response.json() as QRImportResult;
    } catch {
      setNetworkIssue(true);
      return;
    } finally {
      sending.current = false;
      setBusy(false);
    }
    setResult(outcome);
    if (outcome.created) onImported();
  }

  const valid = draft?.rows.filter(row => "mode" in row).length ?? 0;
  const invalid = (draft?.rows.length ?? 0) - valid;
  const retry = networkIssue || Boolean(result?.failed);
  const resultsByLine = new Map(result?.rows.map(row => [row.line, row]));
  const summary = result
    ? copy.created + " " + format.format(result.created) + " · " + copy.skipped + " " + format.format(result.invalid)
      + " · " + copy.failed + " " + format.format(result.failed)
    : copy.validCount + " " + format.format(valid) + " · " + copy.invalidCount + " " + format.format(invalid);

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant="outline"
        onClick={() => {
          dialog.current?.showModal();
          fileInput.current?.focus();
        }}
      >
        <Upload aria-hidden="true" />
        {copy.open}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={detailsId}
        onClose={reset}
        onCancel={event => { if (sending.current) event.preventDefault(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-xl border bg-background p-0 text-start text-foreground shadow-xl backdrop:bg-black/50"
      >
        <div className="flex max-h-[calc(100dvh_-_2rem)] flex-col">
          <header className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">{copy.title}</h2>
              <p id={detailsId} className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={copy.close}
              disabled={busy}
              onClick={() => dialog.current?.close()}
              className="size-9 shrink-0"
            >
              <X aria-hidden="true" />
            </Button>
          </header>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-muted px-3 text-sm font-medium hover:bg-accent focus-within:ring-2 focus-within:ring-ring has-[:disabled]:cursor-default has-[:disabled]:opacity-50">
                <FileUp className="size-4 shrink-0" aria-hidden="true" />
                {draft ? copy.changeFile : copy.chooseFile}
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy || networkIssue}
                  className="sr-only"
                  onChange={event => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void previewFile(file);
                  }}
                />
              </label>
              <Button variant="ghost" asChild>
                <a href={templateUrl} download="qrconnect-import-template.csv">
                  <Download aria-hidden="true" />
                  {copy.template}
                </a>
              </Button>
            </div>
            {!draft && <p className="mt-2 text-sm text-muted-foreground">{copy.modeHint}</p>}
            {reading && <p className="mt-3 text-sm" role="status">{copy.reading}</p>}
            {fileIssue && <p className="mt-3 text-sm text-destructive" role="alert">{copy[fileIssue]}</p>}
            {networkIssue && <p className="mt-3 text-sm text-destructive" role="alert">{copy.networkIssue}</p>}

            {draft && (
              <section className="mt-5" aria-labelledby={titleId + "-summary"}>
                <h3 id={titleId + "-summary"} ref={summaryHeading} tabIndex={-1} className="font-semibold">
                  {result ? copy.results : copy.preview}
                </h3>
                <p className="mt-1 break-all text-sm text-muted-foreground"><bdi>{draft.file.name}</bdi></p>
                <p role="status" className="mb-3 mt-2 text-sm font-medium tabular-nums">{summary}</p>
                {result && result.failed > 0 && <p className="mb-3 text-sm text-muted-foreground">{copy.retryHint}</p>}
                <div
                  className="max-h-64 overflow-auto rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="region"
                  tabIndex={0}
                  aria-label={result ? copy.results : copy.preview}
                >
                  <table className="w-full table-fixed text-start text-sm">
                    <thead className="sticky top-0 border-b bg-muted">
                      <tr>
                        <th scope="col" className="w-12 px-2 py-2 text-start font-medium sm:w-16 sm:px-3">{copy.line}</th>
                        <th scope="col" className="px-2 py-2 text-start font-medium sm:px-3">{copy.qrCode}</th>
                        <th scope="col" className="w-[43%] px-2 py-2 text-start font-medium sm:w-2/5 sm:px-3">{copy.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {draft.rows.map(row => {
                        const outcome = resultsByLine.get(row.line);
                        const issue = outcome?.status === "invalid" ? outcome.issue
                          : "issue" in row ? row.issue : undefined;
                        const failed = outcome?.status === "failed";
                        const created = outcome?.status === "created";
                        const status = issue ? copy[issue] : failed ? copy.failed : created ? copy.created : copy.ready;
                        return (
                          <tr key={row.line} className="align-top">
                            <td className="px-2 py-2 tabular-nums text-muted-foreground sm:px-3">{format.format(row.line)}</td>
                            <td className="px-2 py-2 sm:px-3">
                              <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere] font-medium">{row.title || "—"}</p>
                              {row.destination && <bdi dir="ltr" className="block text-xs [overflow-wrap:anywhere] text-muted-foreground">{row.destination}</bdi>}
                              {"mode" in row && <p className="mt-1 text-xs text-muted-foreground">{copy[row.mode]}</p>}
                            </td>
                            <td className="px-2 py-2 sm:px-3">
                              <div className={issue || failed ? "flex gap-1.5 text-destructive" : "flex gap-1.5"}>
                                {issue || failed
                                  ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                  : <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />}
                                <span>{status}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          <footer className="flex flex-wrap justify-end gap-2 border-t bg-muted/30 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant={result && !retry ? "default" : "outline"}
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              {result && !retry ? copy.done : copy.close}
            </Button>
            {(!result || retry) && (
              <Button type="button" disabled={!valid || busy || reading} onClick={() => void importRows()}>
                {busy && <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />}
                {busy ? copy.importing : retry ? copy.retry : copy.importRows}
              </Button>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}
