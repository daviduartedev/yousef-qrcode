import { Download, Loader2, Tags, X } from "lucide-react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportQRBlob, saveDownload, type QRFileFormat } from "@/lib/qr-export";
import { makeQRArchive } from "@/lib/qr-zip";
import { qrBulkLabelLimit } from "@/lib/qr-list";
import type { QRCodeRecord } from "@/lib/qr-types";
import { getQRCode } from "@/lib/qrTracking";
import { loadAssetImage } from "@/lib/asset-image";

const messages = {
  en: {
    selected: "Selected",
    actions: "Actions for selected QR Codes",
    download: "Download ZIP",
    labels: "Labels",
    applyLabels: "Apply labels",
    clear: "Clear selection",
    chooseLabels: "Choose labels to add to the selected QR Codes.",
    labelLimit: (limit: string) => `Select up to ${limit} labels at a time.`,
    noLabels: "Create a label before applying it to selected QR Codes.",
    preparing: "Preparing the ZIP…",
    applying: "Applying labels…",
    zipSuccess: "Files in ZIP",
    labelSuccess: "QR Codes updated",
    failed: "Failed",
    downloaded: "Included in ZIP",
    labeled: "Labels applied",
    unavailable: "QR Code unavailable",
    fileError: "Could not export this QR Code",
    zipError: "Could not prepare the ZIP. Try again.",
    labelError: "Could not confirm the update. Check the list and try again.",
  },
  ar: {
    selected: "المحدّدة",
    actions: "إجراءات رموز QR المحدّدة",
    download: "تنزيل ZIP",
    labels: "التسميات",
    applyLabels: "تطبيق التسميات",
    clear: "إلغاء التحديد",
    chooseLabels: "اختر التسميات التي تريد إضافتها إلى رموز QR المحدّدة.",
    labelLimit: (limit: string) => `اختر ما يصل إلى ${limit} تسمية في كل مرة.`,
    noLabels: "أنشئ تسمية أولًا لتطبيقها على رموز QR المحدّدة.",
    preparing: "جارٍ تجهيز ملف ZIP…",
    applying: "جارٍ تطبيق التصنيفات…",
    zipSuccess: "الملفات في ZIP",
    labelSuccess: "رموز QR المحدّثة",
    failed: "تعذّر الإجراء",
    downloaded: "أُضيف إلى ZIP",
    labeled: "طُبّقت التسميات",
    unavailable: "رمز QR غير متاح",
    fileError: "تعذّر تصدير رمز QR",
    zipError: "تعذّر تجهيز ملف ZIP. حاول مرة أخرى.",
    labelError: "تعذّر تأكيد التحديث. راجع القائمة وحاول مرة أخرى.",
  },
};

type Operation = "download" | "labels";
type RowResult = { id: string; name: string; success: boolean };
type Outcome = { operation: Operation; rows: RowResult[] };
type LabelUpdate = { results: { id: string; status: "updated" | "not_found" }[] };

function rowResult(qr: QRCodeRecord, success: boolean): RowResult {
  return { id: qr.id, name: qr.title || qr.destination_url, success };
}

async function downloadSelected(
  selected: QRCodeRecord[],
  format: QRFileFormat,
  origin: string,
  signal: AbortSignal,
) {
  const { default: QRCodePreview } = await import("@/components/QRCodePreview");
  // Use the same renderer as the editor without rendering temporary previews in the page.
  const container = document.createElement("div");
  const root = createRoot(container);
  const entries: { name: string; image: Blob }[] = [];
  const rows: RowResult[] = [];
  try {
    for (const selectedQR of selected) {
      try {
        const { qrCode, trackingUrl } = await getQRCode(selectedQR.id);
        signal.throwIfAborted();
        const data = qrCode.tracking_enabled
          ? trackingUrl ?? (origin + "/qr?code=" + encodeURIComponent(qrCode.short_code))
          : qrCode.destination_url;
        const logoAssetId = qrCode.design?.logoAssetId;
        const logoImage = logoAssetId ? await loadAssetImage(logoAssetId) : undefined;
        if (logoAssetId && !logoImage) throw new Error("Library logo is unavailable");
        signal.throwIfAborted();
        flushSync(() => root.render(<QRCodePreview
          data={data}
          design={qrCode.design ?? undefined}
          logoImage={logoImage}
        />));
        const image = await exportQRBlob(container.querySelector("svg"), format);
        entries.push({ name: `qr-${qrCode.short_code}.${format}`, image });
        rows.push(rowResult(qrCode, true));
      } catch {
        signal.throwIfAborted();
        rows.push(rowResult(selectedQR, false));
      }
    }
  } finally {
    root.unmount();
  }

  if (entries.length) {
    const archive = await makeQRArchive(entries);
    signal.throwIfAborted();
    saveDownload(archive, "qr-codes.zip");
  }
  return rows;
}

export function QRBulkActions({ selected, onClear, onChanged, labels, origin }: {
  selected: QRCodeRecord[];
  onClear: () => void;
  onChanged: () => void;
  labels: { id: string; name: string }[];
  origin: string;
}) {
  const { i18n } = useTranslation("copy");
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("ar") ? "ar" : "en";
  const copy = messages[language];
  const number = new Intl.NumberFormat(language);
  const labelsPanelId = useId();
  const labelsTrigger = useRef<HTMLButtonElement>(null);
  const task = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState<Operation | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [checkedLabels, setCheckedLabels] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<Operation | null>(null);
  const labelIds = labels.filter(label => checkedLabels.includes(label.id)).map(label => label.id);

  useEffect(() => () => task.current?.abort(), []);

  function begin(operation: Operation) {
    const controller = new AbortController();
    task.current = controller;
    setBusy(operation);
    setError(null);
    setOutcome(null);
    return controller;
  }

  function finish(controller: AbortController) {
    task.current = null;
    if (!controller.signal.aborted) setBusy(null);
  }

  async function download(format: QRFileFormat) {
    if (task.current || !selected.length) return;
    const controller = begin("download");
    try {
      const rows = await downloadSelected(selected, format, origin, controller.signal);
      if (!controller.signal.aborted) setOutcome({ operation: "download", rows });
    } catch {
      if (!controller.signal.aborted) setError("download");
    } finally {
      finish(controller);
    }
  }

  async function applyLabels() {
    if (task.current || !selected.length || !labelIds.length) return;
    const controller = begin("labels");
    try {
      const response = await fetch("/api/qr-codes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selected.map(qr => qr.id), labelIds }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Unable to apply labels");
      const { results } = await response.json() as LabelUpdate;
      controller.signal.throwIfAborted();
      const updated = new Set(results.filter(row => row.status === "updated").map(row => row.id));
      setOutcome({ operation: "labels", rows: selected.map(qr => rowResult(qr, updated.has(qr.id))) });
      setCheckedLabels([]);
      setLabelsOpen(false);
      onChanged();
    } catch {
      if (!controller.signal.aborted) setError("labels");
    } finally {
      finish(controller);
      if (!controller.signal.aborted) requestAnimationFrame(() => labelsTrigger.current?.focus());
    }
  }

  const succeeded = outcome?.rows.filter(row => row.success).length ?? 0;
  const failed = outcome ? outcome.rows.length - succeeded : 0;

  return (
    <section aria-label={copy.actions} className="min-w-0 rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <p aria-live="polite" className="me-auto flex items-center gap-2 text-sm font-medium">
          <span className="rounded bg-primary/10 px-2 py-0.5 tabular-nums text-primary">
            {number.format(selected.length)}
          </span>
          {copy.selected}
        </p>
        <DropdownMenu dir={language === "ar" ? "rtl" : "ltr"}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11" disabled={busy !== null}>
              <Download aria-hidden="true" />
              {copy.download}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="min-h-11" onSelect={() => void download("png")}>PNG</DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={() => void download("svg")}>SVG</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          ref={labelsTrigger}
          type="button"
          variant={labelsOpen ? "secondary" : "outline"}
          className="min-h-11"
          aria-expanded={labelsOpen}
          aria-controls={labelsOpen ? labelsPanelId : undefined}
          disabled={busy !== null}
          onClick={() => setLabelsOpen(open => !open)}
        >
          <Tags aria-hidden="true" />
          {copy.labels}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" disabled={busy !== null} onClick={onClear}>
          <X aria-hidden="true" />
          {copy.clear}
        </Button>
      </div>

      {labelsOpen && (
        <div id={labelsPanelId} className="grid gap-2 border-t p-3">
          {labels.length ? (
            <>
              <fieldset className="grid min-w-0 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                <legend className="mb-1 text-sm text-muted-foreground">
                  {copy.chooseLabels} {labels.length > qrBulkLabelLimit && copy.labelLimit(number.format(qrBulkLabelLimit))}
                </legend>
                {labels.map(label => (
                  <label key={label.id} className="flex min-h-11 min-w-0 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-primary"
                      checked={checkedLabels.includes(label.id)}
                      disabled={busy !== null || (labelIds.length >= qrBulkLabelLimit && !checkedLabels.includes(label.id))}
                      onChange={event => {
                        const checked = event.target.checked;
                        setCheckedLabels(current => checked
                          ? [...current, label.id]
                          : current.filter(id => id !== label.id));
                      }}
                    />
                    <bdi className="min-w-0 break-words">{label.name}</bdi>
                  </label>
                ))}
              </fieldset>
              <Button
                type="button"
                className="min-h-11 justify-self-start"
                disabled={busy !== null || !labelIds.length}
                onClick={() => void applyLabels()}
              >
                {copy.applyLabels}
              </Button>
            </>
          ) : <p className="text-sm text-muted-foreground">{copy.noLabels}</p>}
        </div>
      )}
      {busy && (
        <div role="status" className="flex items-center gap-2 border-t p-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          {busy === "download" ? copy.preparing : copy.applying}
        </div>
      )}
      {error && <p role="alert" className="border-t p-3 text-sm text-destructive">
        {error === "download" ? copy.zipError : copy.labelError}
      </p>}
      {outcome && (
        <div className="grid gap-2 border-t p-3 text-sm">
          <p role="status" className="flex flex-wrap gap-x-4 gap-y-1 font-medium">
            <span>{outcome.operation === "download" ? copy.zipSuccess : copy.labelSuccess}: {number.format(succeeded)}</span>
            {failed > 0 && <span className="text-destructive">{copy.failed}: {number.format(failed)}</span>}
          </p>
          {failed > 0 && (
            <ul className="grid divide-y rounded-md border">
              {outcome.rows.map(row => (
                <li key={row.id} className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 px-3 py-2">
                  <bdi className="min-w-0 break-words">{row.name}</bdi>
                  <span className={row.success ? "text-muted-foreground" : "text-destructive"}>
                    {outcome.operation === "download"
                      ? row.success ? copy.downloaded : copy.fileError
                      : row.success ? copy.labeled : copy.unavailable}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
