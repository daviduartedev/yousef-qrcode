import { analyticsCsv } from '@/server/analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    return new Response('﻿' + await analyticsCsv(workspace.id, query), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="qrconnect-scans-${query.from}-${query.to}.csv"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) { return apiError(error); }
}
