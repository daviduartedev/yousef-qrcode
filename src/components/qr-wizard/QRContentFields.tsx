"use client";

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { StaticQRType } from "@/lib/qr-content";
import { fieldErrors, type ContentField, type ContentFields } from "./content";

type Props = {
  type: StaticQRType;
  fields: ContentFields;
  onChange: (fields: ContentFields) => void;
  invalid: readonly ContentField[];
  showErrors: boolean;
  readOnly?: boolean;
};

export function QRContentFields({ type, fields, onChange, invalid, showErrors, readOnly }: Props) {
  const { t } = useTranslation("creation");
  const id = useId();
  const set = <K extends ContentField>(key: K, value: ContentFields[K]) => onChange({ ...fields, [key]: value });
  const error = (key: ContentField) => (showErrors && invalid.includes(key) ? t(fieldErrors[key]) : null);
  const field = (key: ContentField, label: string, control: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode, required = false) => {
    const message = error(key);
    const inputId = `${id}-${key}`;
    return (
      <div className="space-y-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {t(label)}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        {control({ id: inputId, "aria-invalid": Boolean(message), "aria-describedby": message ? `${inputId}-error` : undefined })}
        {message && (
          <p id={`${inputId}-error`} className="text-sm text-destructive">
            {message}
          </p>
        )}
      </div>
    );
  };
  const text = (key: "text" | "to" | "subject" | "number" | "ssid" | "password", label: string, options: { required?: boolean; type?: string; dir?: "ltr" | "auto"; maxLength?: number; autoComplete?: string } = {}) =>
    field(key, label, (props) => (
      <Input
        {...props}
        type={options.type ?? "text"}
        dir={options.dir ?? "auto"}
        maxLength={options.maxLength}
        autoComplete={options.autoComplete ?? "off"}
        readOnly={readOnly}
        required={options.required}
        value={fields[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    ), options.required);
  const area = (key: "text" | "body" | "message", label: string, maxLength: number, required = false) =>
    field(key, label, (props) => (
      <Textarea
        {...props}
        dir="auto"
        rows={4}
        maxLength={maxLength}
        readOnly={readOnly}
        required={required}
        value={fields[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    ), required);

  switch (type) {
    case "text":
      return <div className="space-y-4">{area("text", "Text", 1000, true)}</div>;
    case "email":
      return (
        <div className="space-y-4">
          {text("to", "Recipient email", { required: true, type: "email", dir: "ltr", maxLength: 254 })}
          {text("subject", "Subject", { maxLength: 200 })}
          {area("body", "Message", 1000)}
        </div>
      );
    case "phone":
      return <div className="space-y-4">{text("number", "Phone number", { required: true, type: "tel", dir: "ltr", maxLength: 32 })}</div>;
    case "sms":
      return (
        <div className="space-y-4">
          {text("number", "Phone number", { required: true, type: "tel", dir: "ltr", maxLength: 32 })}
          {area("message", "Message", 500)}
        </div>
      );
    case "wifi":
      return (
        <div className="space-y-4">
          {text("ssid", "Network name (SSID)", { required: true, maxLength: 32 })}
          {field("security", "Security", (props) => (
            <select
              {...props}
              disabled={readOnly}
              className="w-full rounded-md border border-border bg-background p-2"
              value={fields.security}
              onChange={(event) => set("security", event.target.value as ContentFields["security"])}
            >
              <option value="WPA">{t("WPA/WPA2/WPA3")}</option>
              <option value="WEP">{t("WEP")}</option>
              <option value="nopass">{t("No password")}</option>
            </select>
          ))}
          {fields.security !== "nopass" &&
            text("password", "Password", { required: true, dir: "ltr", maxLength: 63, autoComplete: "new-password" })}
          <div className="flex items-center gap-2">
            <Switch
              id={`${id}-hidden`}
              checked={fields.hidden}
              disabled={readOnly}
              onCheckedChange={(value) => set("hidden", value)}
            />
            <label htmlFor={`${id}-hidden`} className="text-sm font-medium">
              {t("Hidden network")}
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("Anyone who scans this code can read the network password.")}
          </p>
        </div>
      );
  }
}
