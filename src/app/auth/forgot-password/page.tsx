import type { Metadata } from 'next';
import ForgotPassword from '@/views/ForgotPassword';
import { emailDeliveryAvailable } from '@/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPassword available={emailDeliveryAvailable()} />;
}
