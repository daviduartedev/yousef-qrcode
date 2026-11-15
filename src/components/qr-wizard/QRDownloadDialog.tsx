"use client";

import { useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadQR, qrFileSizes, type QRFileFormat, type QRFileSize } from "@/lib/qr-export";
import { allowedErrorCorrection, type ErrorCorrectionLevel } from "@/lib/qr-matrix";
import type { QRDesign } from "@/lib/qr-design";
import { useAssetImage } from "@/lib/asset-image";

const QRCodePreview = dynamic(() => import("@/components/QRCodePreview"), { ssr: false });

const levelHints: Record<ErrorCorrectionLevel, string> = {
  L: "Low (7%) · smallest pattern",
  M: "Medium (15%)",
  Q: "Quartile (25%)",
  H: "High (30%) · most resilient",
};

type Props = {
  data: string;
  design: QRDesign;
  name: string;
  disabled?: boolean;
  onError: () => void;
};

/** Download with documented format, pixel size and error correction. */
export function QRDownloadDialog({ data, design, name, disabled, onError }: Props) {
  const { t } = useTranslation("creation");
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const render = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<QRFileFormat>("png");
  const [size, setSize] = useState<QRFileSize>(1024);
  const levels = allowedErrorCorrection(Boolean(design.logoId || design.logoAssetId));
  const [level, setLevel] = useState<ErrorCorrectionLevel>("H");
  const [busy, setBusy] = useState(false);
  // Library logos are loaded before export so the file never misses the image.
  const logoImage = useAssetImage(design.logoAssetId ?? null);
  const logoLoading = Boolean(design.logoAssetId) && logoImage === undefined;
  const effectiveLevel = levels.includes(level) ? level : "H";

  const save = async () => {
    setBusy(true);
    try {
      await downloadQR(render.current?.querySelector("svg") ?? null, format, name, size);
      dialog.current?.close();
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="lg" className="w-full" disabled={disabled || !data} onClick={() => dialog.current?.showModal()}>
        <Download className="w-4 h-4 me-2" aria-hidden="true" />
        {t("Download QR")}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <form method="dialog" className="space-y-5 p-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-title`} className="text-lg font-semibold">{t("Download QR")}</h2>
            <button type="button" className="rounded p-1 hover:bg-muted" aria-label={t("Close")} onClick={() => dialog.current?.close()}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("Format")}</legend>
            <div className="flex gap-4">
              {(["png", "svg"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={`${id}-format`} value={value} checked={format === value} onChange={() => setFormat(value)} />
                  {value.toUpperCase()}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1">
            <label htmlFor={`${id}-size`} className="text-sm font-medium">{t("Size")}</label>
            <select id={`${id}-size`} className="w-full rounded-md border border-border bg-background p-2" value={size}
              onChange={(event) => setSize(Number(event.target.value) as QRFileSize)}>
              {qrFileSizes.map((value) => (
                <option key={value} value={value}>{t("{{size}} px wide", { size: value })}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-level`} className="text-sm font-medium">{t("Error correction")}</label>
            <select id={`${id}-level`} className="w-full rounded-md border border-border bg-background p-2" value={effectiveLevel}
              onChange={(event) => setLevel(event.target.value as ErrorCorrectionLevel)}>
              {levels.map((value) => (
                <option key={value} value={value}>{`${value} · ${t(levelHints[value])}`}</option>
              ))}
            </select>
            {(design.logoId || design.logoAssetId) && <p className="text-xs text-muted-foreground">{t("Logos cover part of the code, so only Q and H are offered.")}</p>}
          </div>
          <div ref={render} className="flex justify-center rounded-md border border-border bg-background p-3" aria-label={t("Download preview")}>
            <QRCodePreview data={data} design={design} width={160} errorCorrection={effectiveLevel} logoImage={design.logoAssetId ? logoImage ?? null : undefined} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>{t("Cancel")}</Button>
            <Button type="submit" disabled={busy || logoLoading}>{busy ? t("Downloading...") : t("Download")}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
