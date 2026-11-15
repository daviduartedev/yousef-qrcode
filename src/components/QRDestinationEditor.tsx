"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeDestination } from "@/lib/qr-design";
import {
  changeQRDestination,
  getQRDestinationChanges,
  QRRequestError,
  type SavedQRCode,
} from "@/lib/qrTracking";
import type { QRCodeRecord, QRDestinationChange } from "@/lib/qr-types";

type Props = { record: QRCodeRecord; onChanged: (result: SavedQRCode) => void };

/** Changes where a tracked QR redirects; the printed code and its scans stay the same. */
export function QRDestinationEditor({ record, onChanged }: Props) {
  const { t, i18n } = useTranslation("creation");
  const id = useId();
  const [value, setValue] = useState(record.destination_url);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "status"; text: string } | null>(null);
  const [changes, setChanges] = useState<QRDestinationChange[] | null>(null);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setChanges((await getQRDestinationChanges(record.id)).changes);
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    }
  }, [record.id]);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const destination = normalizeDestination(value);
  const unchanged = destination === record.destination_url;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destination) {
      setMessage({ tone: "error", text: t("Enter a valid HTTP/HTTPS URL.") });
      return;
    }
    if (unchanged) {
      setMessage({ tone: "error", text: t("This QR code already uses that destination.") });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await changeQRDestination(record.id, destination);
      setValue(result.qrCode.destination_url);
      onChanged(result);
      setMessage({ tone: "status", text: t("Destination updated. The printed code now opens the new address.") });
      await loadHistory();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof QRRequestError && error.status === 409
          ? t("This QR code already uses that destination.")
          : t("Unable to change the destination. Try again."),
      });
    } finally {
      setSaving(false);
    }
  };
  const format = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  if (!record.tracking_enabled)
    return (
      <p className="text-sm text-muted-foreground">
        {t("Direct and static QR codes store their content in the pattern. Create a new QR to change it.")}
      </p>
    );
  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3">
      <h3 id={`${id}-title`} className="text-sm font-semibold">{t("Destination")}</h3>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-url`} className="sr-only">{t("New destination URL")}</label>
        <Input
          id={`${id}-url`}
          dir="ltr"
          type="url"
          inputMode="url"
          maxLength={2048}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={message?.tone === "error"}
          aria-describedby={`${id}-hint`}
          className="flex-1"
        />
        <Button type="submit" disabled={saving || !value.trim() || unchanged}>
          {saving ? t("Saving...") : t("Change destination")}
        </Button>
      </form>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {t("The QR image and its tracking URL stay the same. Scans recorded so far are kept.")}
      </p>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-destructive" : "text-green-700 dark:text-green-400"}`}>
          {message.text}
        </p>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">{t("Destination history")}</summary>
        {historyError ? (
          <p role="alert" className="mt-2 text-destructive">{t("Unable to load the history.")}</p>
        ) : !changes ? (
          <p role="status" className="mt-2 text-muted-foreground">{t("Loading...")}</p>
        ) : changes.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t("No destination changes yet.")}</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {changes.map((change) => (
              <li key={change.id} className="rounded-md border border-border p-2">
                <time dateTime={change.changed_at} className="block text-xs text-muted-foreground">{format(change.changed_at)}</time>
                <bdi dir="ltr" className="block break-all line-through opacity-70">{change.previous_url}</bdi>
                <bdi dir="ltr" className="block break-all">{change.new_url}</bdi>
              </li>
            ))}
          </ol>
        )}
      </details>
    </section>
  );
}
