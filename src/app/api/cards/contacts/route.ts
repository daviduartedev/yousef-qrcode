import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { cardContactsCsv, listCardContacts } from '@/server/cards';

export const runtime = 'nodejs';

/** Contacts left on the account's cards; `?format=csv` downloads them. */
export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    const params = new URL(request.url).searchParams;
    const csv = params.get('format') === 'csv';
    // The export includes every contact; the screen shows the latest 500.
    const contacts = await listCardContacts(workspace.id, { card: params.get('card'), q: (params.get('q') ?? '').trim().slice(0, 120) }, csv ? 100000 : 500);
    if (csv) return new Response(cardContactsCsv(contacts), { headers: { ...privateHeaders,
      'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="card-contacts.csv"' } });
    return Response.json({ contacts }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
