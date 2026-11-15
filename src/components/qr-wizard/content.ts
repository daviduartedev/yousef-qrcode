import {
  encodeQRContent,
  maxPayloadBytes,
  qrContentSchema,
  utf8Length,
  type QRContent,
  type StaticQRType,
} from "@/lib/qr-content";

export interface ContentFields {
  text: string;
  to: string;
  subject: string;
  body: string;
  number: string;
  message: string;
  ssid: string;
  security: "WPA" | "WEP" | "nopass";
  password: string;
  hidden: boolean;
}
export type ContentField = keyof ContentFields;

export const emptyFields: ContentFields = {
  text: "",
  to: "",
  subject: "",
  body: "",
  number: "",
  message: "",
  ssid: "",
  security: "WPA",
  password: "",
  hidden: false,
};

export function contentInput(type: StaticQRType, fields: ContentFields) {
  switch (type) {
    case "text":
      return { type, text: fields.text };
    case "email":
      return { type, to: fields.to, subject: fields.subject, body: fields.body };
    case "phone":
      return { type, number: fields.number };
    case "sms":
      return { type, number: fields.number, message: fields.message };
    case "wifi":
      return {
        type,
        ssid: fields.ssid,
        security: fields.security,
        password: fields.security === "nopass" ? "" : fields.password,
        hidden: fields.hidden,
      };
  }
}

export function fieldsFromContent(content: QRContent): ContentFields {
  return { ...emptyFields, ...content } as ContentFields;
}

export type ContentCheck =
  | { ok: true; content: QRContent; payload: string }
  | { ok: false; fields: ContentField[]; tooLong: boolean };

export function checkContent(type: StaticQRType, fields: ContentFields): ContentCheck {
  const parsed = qrContentSchema.safeParse(contentInput(type, fields));
  if (!parsed.success)
    return {
      ok: false,
      tooLong: false,
      fields: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0]) as ContentField))],
    };
  const payload = encodeQRContent(parsed.data);
  if (utf8Length(payload) > maxPayloadBytes) return { ok: false, fields: [], tooLong: true };
  return { ok: true, content: parsed.data, payload };
}

export const fieldErrors: Record<ContentField, string> = {
  text: "Enter the text to encode, up to 1,000 characters.",
  to: "Enter a valid email address.",
  subject: "Use one line of up to 200 characters.",
  body: "Use up to 1,000 characters.",
  number: "Enter 3 to 20 digits, optionally starting with +.",
  message: "Use up to 500 characters.",
  ssid: "Enter the network name, up to 32 characters.",
  security: "Choose the network security.",
  password: "Enter the network password: 8 to 63 characters for WPA.",
  hidden: "Choose whether the network is hidden.",
};
