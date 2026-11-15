import { z } from 'zod';

/** QR types that open something published in the workspace; the server derives the address and keeps scans tracked. */
export const linkedQRKinds = ['linkpage', 'card', 'form', 'file'] as const;
export type LinkedQRKind = (typeof linkedQRKinds)[number];
export const isLinkedQRType = (value: string): value is LinkedQRKind => (linkedQRKinds as readonly string[]).includes(value);

export const linkedInputSchema = z.object({ kind: z.enum(linkedQRKinds), id: z.uuid() }).strict();
export type LinkedContent = { type: LinkedQRKind; id: string };

export const linkedLabels: Record<LinkedQRKind, string> = { linkpage: 'Linkpage', card: 'Digital card', form: 'Form', file: 'PDF or image' };
