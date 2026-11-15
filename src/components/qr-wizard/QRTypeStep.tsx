"use client";

import {
  AppWindow,
  Contact,
  FileInput,
  FileText,
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Type,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CreatableQRType } from "@/lib/qr-content";

export type WizardType = CreatableQRType | "contactCard";

const available: { type: WizardType; icon: LucideIcon; label: string; hint: string }[] = [
  { type: "website", icon: Globe, label: "Website", hint: "Open a web page. Choose dynamic to track scans and change the destination later." },
  { type: "text", icon: Type, label: "Text", hint: "Show plain text. Static: the text is stored in the code." },
  { type: "email", icon: Mail, label: "Email", hint: "Start an email with recipient, subject and message." },
  { type: "phone", icon: Phone, label: "Phone", hint: "Call a phone number." },
  { type: "sms", icon: MessageSquare, label: "SMS", hint: "Start a text message to a number." },
  { type: "wifi", icon: Wifi, label: "Wi-Fi", hint: "Join a Wi-Fi network without typing the password." },
  { type: "contactCard", icon: Contact, label: "Contact card", hint: "Local preview editor. Publishing cards arrives with the Cards module." },
];
const upcoming: { icon: LucideIcon; label: string }[] = [
  { icon: Link2, label: "Linkpage" },
  { icon: FileText, label: "PDF" },
  { icon: AppWindow, label: "App download" },
  { icon: MapPin, label: "Location" },
  { icon: FileInput, label: "Form" },
];

export function QRTypeStep({ value, onSelect }: { value: WizardType; onSelect: (type: WizardType) => void }) {
  const { t } = useTranslation("creation");
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-lg font-semibold mb-1">{t("Choose a QR code type")}</legend>
        <p className="text-sm text-muted-foreground mb-4">{t("The type defines what the code opens when it is scanned.")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={t("QR code type")}>
          {available.map(({ type, icon: Icon, label, hint }) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={value === type}
              data-qr-type={type}
              onClick={() => onSelect(type)}
              className={`flex min-h-24 items-start gap-3 rounded-lg border-2 p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                value === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
              }`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block font-semibold">{t(label)}</span>
                <span className="block text-sm text-muted-foreground">{t(hint)}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <section aria-labelledby="qr-upcoming-types">
        <h3 id="qr-upcoming-types" className="text-sm font-semibold mb-2">{t("Coming with their modules")}</h3>
        <ul className="flex flex-wrap gap-2">
          {upcoming.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(label)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
