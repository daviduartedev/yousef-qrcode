import type { Metadata } from 'next';
import { gateInfo } from '@/server/scans';
import QRGate from '@/views/QRGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Open QR code', robots: { index: false } };

export default async function GatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const code = (await searchParams).code;
  return <QRGate info={typeof code === 'string' ? await gateInfo(code) : null} />;
}
