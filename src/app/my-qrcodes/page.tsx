import { requirePageSession } from '@/server/session';
import MyQRCodes from '@/views/MyQRCodes';
export const runtime = 'nodejs';
export default async function MyCodes() {
  await requirePageSession();
  return <MyQRCodes />;
}
