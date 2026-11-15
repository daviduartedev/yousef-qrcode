import { z } from "zod";
import { safeDestination } from "./qr-destination";

/**
 * Contract for QR types whose payload is encoded directly in the code.
 * The server stores the structured content and derives `destination_url`
 * from it, so lists, ZIP downloads and search keep reading one field.
 */
export const staticQRTypes = ["text", "email", "phone", "sms", "wifi"] as const;
export type StaticQRType = (typeof staticQRTypes)[number];
export const creatableQRTypes = ["website", ...staticQRTypes] as const;
export type CreatableQRType = (typeof creatableQRTypes)[number];

/** Byte-mode capacity of version 40 at error correction H is 1273 bytes. */
export const maxPayloadBytes = 1200;

const noControl = (value: string) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const lineFree = (value: string) => !/[\r\n]/.test(value);
const text = (max: number) => z.string().max(max).refine(noControl);
const phone = z
  .string()
  .trim()
  .max(32)
  .regex(/^\+?[0-9][0-9 ().-]{2,31}$/)
  .transform((value) => value.replace(/[ ().-]/g, ""))
  .refine((value) => /^\+?[0-9]{3,20}$/.test(value));

export const qrContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: text(1000).refine((value) => value.trim().length > 0) }).strict(),
  z
    .object({
      type: z.literal("email"),
      to: z.string().trim().max(254).email(),
      subject: text(200).refine(lineFree).default(""),
      body: text(1000).default(""),
    })
    .strict(),
  z.object({ type: z.literal("phone"), number: phone }).strict(),
  z.object({ type: z.literal("sms"), number: phone, message: text(500).default("") }).strict(),
  z
    .object({
      type: z.literal("wifi"),
      ssid: text(32).refine(lineFree).refine((value) => value.length > 0 && utf8Length(value) <= 32),
      security: z.enum(["WPA", "WEP", "nopass"]),
      password: text(63).refine(lineFree).default(""),
      hidden: z.boolean().default(false),
    })
    .strict()
    .refine(
      (value) =>
        value.security === "nopass" ||
        (value.security === "WPA" ? value.password.length >= 8 : value.password.length > 0),
      { path: ["password"] },
    ),
]);
export type QRContent = z.infer<typeof qrContentSchema>;
export type QRContentInput = z.input<typeof qrContentSchema>;

const escapeWifi = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");

export function encodeQRContent(content: QRContent): string {
  switch (content.type) {
    case "text":
      return content.text;
    case "email": {
      const query = [
        content.subject && `subject=${encodeURIComponent(content.subject)}`,
        content.body && `body=${encodeURIComponent(content.body)}`,
      ].filter(Boolean);
      return `mailto:${content.to}${query.length ? `?${query.join("&")}` : ""}`;
    }
    case "phone":
      return `tel:${content.number}`;
    case "sms":
      return `SMSTO:${content.number}:${content.message}`;
    case "wifi":
      return `WIFI:T:${content.security};S:${escapeWifi(content.ssid)};${
        content.security === "nopass" ? "" : `P:${escapeWifi(content.password)};`
      }${content.hidden ? "H:true;" : ""};`;
  }
}

export const utf8Length = (value: string) => new TextEncoder().encode(value).byteLength;

/** Parses user content and returns the payload, or null when it cannot be encoded. */
export function parseQRContent(input: unknown): { content: QRContent; payload: string } | null {
  const parsed = qrContentSchema.safeParse(input);
  if (!parsed.success) return null;
  const payload = encodeQRContent(parsed.data);
  return utf8Length(payload) <= maxPayloadBytes ? { content: parsed.data, payload } : null;
}

export const isStaticQRType = (value: string): value is StaticQRType =>
  (staticQRTypes as readonly string[]).includes(value);

/** Records created before Lot 6 stored editor tab keys; all of them encode a URL. */
export const qrTypeOf = (value: string): CreatableQRType => (isStaticQRType(value) ? value : "website");

/** Text safe to show in lists without exposing a Wi-Fi password. */
export function describeQRDestination(record: { qr_type: string; destination_url: string; content?: QRContent | null }) {
  const content = record.content;
  if (content?.type === "wifi") return `Wi-Fi · ${content.ssid}`;
  return record.destination_url;
}

export const isLinkDestination = (value: string) => safeDestination(value);
