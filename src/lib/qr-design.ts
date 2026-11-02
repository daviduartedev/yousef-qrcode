import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const gradient = z
  .object({
    type: z.enum(["linear", "radial"]),
    rotation: z.number().finite().min(-360).max(360).optional(),
    colorStops: z
      .array(z.object({ offset: z.number().min(0).max(1), color }).strict())
      .min(2)
      .max(8),
  })
  .strict();
const paint = { color, gradient: gradient.optional() };
export const logoIds = [
  "openai",
  "facebook",
  "twitter",
  "whatsapp",
  "linkedin",
  "instagram",
  "appstore",
  "googleplay",
  "calendar",
  "slack",
  "xcode",
  "youtube",
  "pinterest",
  "bitbucket",
  "cashapp",
  "paypal",
  "venmo",
  "figma",
  "yourlogo1",
  "yourlogo2",
  "trello",
  "scanme",
  "globe",
  "phone",
  "email",
  "share",
] as const;
export const frameStyles = [
  "none",
  "black",
  "blue",
  "red",
  "circle-green",
  "circle-navy",
] as const;

export const qrDesignSchema = z
  .object({
    version: z.literal(1),
    templateId: z.number().int().min(1).max(10),
    dotsOptions: z
      .object({
        ...paint,
        type: z.enum([
          "square",
          "dots",
          "classy",
          "rounded",
          "classy-rounded",
          "extra-rounded",
        ]),
      })
      .strict(),
    cornersSquareOptions: z
      .object({ ...paint, type: z.enum(["square", "dot", "extra-rounded"]) })
      .strict(),
    cornersDotOptions: z
      .object({ ...paint, type: z.enum(["square", "dot"]) })
      .strict(),
    backgroundOptions: z.object(paint).strict(),
    logoId: z.enum(logoIds).nullable(),
    frame: z
      .object({
        style: z.enum(frameStyles),
        text: z
          .string()
          .max(40)
          .refine((text) => !/[\u0000-\u001f]/.test(text)),
      })
      .strict(),
  })
  .strict();
export type QRDesign = z.infer<typeof qrDesignSchema>;
export type QRPaint = QRDesign["backgroundOptions"];

export const defaultDesign: QRDesign = {
  version: 1,
  templateId: 1,
  dotsOptions: { type: "square", color: "#000000" },
  cornersSquareOptions: { type: "square", color: "#000000" },
  cornersDotOptions: { type: "square", color: "#000000" },
  backgroundOptions: { color: "#ffffff" },
  logoId: null,
  frame: { style: "none", text: "" },
};

export function normalizeDestination(value: string) {
  const input = value.trim();
  if (!input || input.length > 2048) return null;
  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`,
    );
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function hasVisibleContrast(design: QRDesign) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const colors = (value: QRPaint) =>
    value.gradient
      ? value.gradient.colorStops.map((stop) => stop.color)
      : [value.color];
  const backgrounds = colors(design.backgroundOptions);
  return [
    design.dotsOptions,
    design.cornersSquareOptions,
    design.cornersDotOptions,
  ].every((part) =>
    colors(part).every((foreground) =>
      backgrounds.every((background) => {
        const a = luminance(foreground),
          b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 2.5;
      }),
    ),
  );
}
