import { analyticsCsv } from '@/server/analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import { apiError, privateHeaders, requireApiUser } from '@/server/http';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    return new Response('﻿' + await analyticsCsv(user.id, query), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="qrconnect-scans-${query.from}-${query.to}.csv"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) { return apiError(error); }
}
