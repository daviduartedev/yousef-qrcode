import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { HttpError } from '@/server/http';
import { addDays, csvCell, daysBetween, type AnalyticsQuery } from '@/lib/qr-analytics';
import type { LinkpageContent } from '@/lib/linkpages';
import { z } from 'zod';

export type LinkpageTotals = { views: number; unique_visitors: number; views_without_address: number; clicks: number };
export type LinkpageAnalytics = {
  page: { id: string; title: string; slug: string };
  query: AnalyticsQuery;
  summary: LinkpageTotals;
  previous: LinkpageTotals;
  daily: { day: string; views: number; clicks: number }[];
  blocks: { block_id: string; label: string; clicks: number }[];
  devices: Record<string, number>;
  countries: Record<string, number>;
};

const range = (from: string, to: string) => sql`e.occurred_at >= ${from}::date and e.occurred_at < (${to}::date + 1)`;

function blockLabel(content: LinkpageContent | null, blockId: string) {
  const block = content?.blocks.find(item => item.id === blockId);
  if (!block) return 'Removed block';
  return 'label' in block ? block.label : block.type === 'social' ? block.network : block.type;
}

/** All figures for one page come from one read-only snapshot; the page must belong to the session user. */
export async function linkpageAnalytics(userId: string, pageId: string, query: AnalyticsQuery): Promise<LinkpageAnalytics> {
  if (!z.uuid().safeParse(pageId).success) throw new HttpError(404, 'Linkpage not found');
  return getDb().transaction(async tx => {
    const { rows: pages } = await tx.execute<{ id: string; title: string; slug: string; draft: LinkpageContent; published: LinkpageContent | null }>(
      sql`select id, title, slug, draft, published from qrconnect.link_pages where id = ${pageId} and user_id = ${userId}`);
    const page = pages[0];
    if (!page) throw new HttpError(404, 'Linkpage not found');
    const filters = sql`e.page_id = ${pageId}${query.device ? sql` and e.device_type = ${query.device}` : sql``}${query.country ? sql` and e.country = ${query.country}` : sql``}`;
    const totals = async (from: string, to: string): Promise<LinkpageTotals> => {
      const { rows } = await tx.execute<LinkpageTotals>(sql`select
          count(*) filter (where kind = 'view')::int as views,
          count(distinct (ip_address, user_agent)) filter (where kind = 'view' and ip_address is not null)::int as unique_visitors,
          count(*) filter (where kind = 'view' and ip_address is null)::int as views_without_address,
          count(*) filter (where kind = 'click')::int as clicks
        from qrconnect.link_page_events e where ${filters} and ${range(from, to)}`);
      return rows[0];
    };
    const length = daysBetween(query.from, query.to) + 1;
    const summary = await totals(query.from, query.to);
    const previous = await totals(addDays(query.from, -length), addDays(query.from, -1));
    const { rows: daily } = await tx.execute<{ day: string; views: number; clicks: number }>(sql`select to_char(d.day, 'YYYY-MM-DD') as day,
        count(e.id) filter (where e.kind = 'view')::int as views, count(e.id) filter (where e.kind = 'click')::int as clicks
      from generate_series(${query.from}::date, ${query.to}::date, interval '1 day') d(day)
      left join qrconnect.link_page_events e on ${filters} and e.occurred_at >= d.day and e.occurred_at < d.day + interval '1 day'
      group by d.day order by d.day`);
    const { rows: blockRows } = await tx.execute<{ block_id: string; clicks: number }>(sql`select block_id, count(*)::int as clicks
      from qrconnect.link_page_events e where ${filters} and ${range(query.from, query.to)} and kind = 'click' and block_id is not null
      group by block_id order by clicks desc, block_id`);
    const breakdown = async (column: 'device_type' | 'country') => {
      const { rows } = await tx.execute<{ key: string | null; total: number }>(sql`select ${sql.raw(column)} as key, count(*)::int as total
        from qrconnect.link_page_events e where ${filters} and ${range(query.from, query.to)} and kind = 'view'
        group by 1 order by total desc, key limit 20`);
      return Object.fromEntries(rows.map(row => [row.key ?? 'Unknown', row.total]));
    };
    return {
      page: { id: page.id, title: page.title, slug: page.slug }, query, summary, previous, daily,
      blocks: blockRows.map(row => ({ ...row, label: blockLabel(page.published ?? page.draft, row.block_id) })),
      devices: await breakdown('device_type'), countries: await breakdown('country'),
    };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}

export function linkpageAnalyticsCsv(data: LinkpageAnalytics) {
  const lines = [['date', 'views', 'clicks'].join(',')];
  for (const day of data.daily) lines.push([csvCell(day.day), day.views, day.clicks].join(','));
  lines.push('', ['block', 'clicks'].join(','));
  for (const block of data.blocks) lines.push([csvCell(block.label), block.clicks].join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
