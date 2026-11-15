import 'server-only';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { HttpError } from '@/server/http';
import { addDays, csvCell, daysBetween, type AnalyticsQuery } from '@/lib/qr-analytics';
import { cardActions, type CardContent } from '@/lib/cards';

export type CardTotals = { views: number; unique_visitors: number; views_without_address: number; saves: number; actions: number; contacts: number };
export type CardAnalytics = {
  card: { id: string; title: string; slug: string };
  query: AnalyticsQuery;
  summary: CardTotals;
  previous: CardTotals;
  daily: { day: string; views: number; saves: number; actions: number; contacts: number }[];
  actions: { target: string; kind: string; label: string; total: number }[];
  devices: Record<string, number>;
  countries: Record<string, number>;
};

const range = (from: string, to: string) => sql`e.occurred_at >= ${from}::date and e.occurred_at < (${to}::date + 1)`;

export async function cardAnalytics(userId: string, cardId: string, query: AnalyticsQuery): Promise<CardAnalytics> {
  if (!z.uuid().safeParse(cardId).success) throw new HttpError(404, 'Card not found');
  return getDb().transaction(async tx => {
    const { rows: found } = await tx.execute<{ id: string; title: string; slug: string; draft: CardContent; published: CardContent | null }>(
      sql`select id, title, slug, draft, published from qrconnect.cards where id = ${cardId} and user_id = ${userId}`);
    const card = found[0];
    if (!card) throw new HttpError(404, 'Card not found');
    const filters = sql`e.card_id = ${cardId}${query.device ? sql` and e.device_type = ${query.device}` : sql``}${query.country ? sql` and e.country = ${query.country}` : sql``}`;
    const totals = async (from: string, to: string): Promise<CardTotals> => (await tx.execute<CardTotals>(sql`select
        count(*) filter (where kind = 'view')::int as views,
        count(distinct (ip_address, user_agent)) filter (where kind = 'view' and ip_address is not null)::int as unique_visitors,
        count(*) filter (where kind = 'view' and ip_address is null)::int as views_without_address,
        count(*) filter (where kind = 'save')::int as saves,
        count(*) filter (where kind = 'action')::int as actions,
        count(*) filter (where kind = 'contact')::int as contacts
      from qrconnect.card_events e where ${filters} and ${range(from, to)}`)).rows[0];
    const length = daysBetween(query.from, query.to) + 1;
    const summary = await totals(query.from, query.to);
    const previous = await totals(addDays(query.from, -length), addDays(query.from, -1));
    const { rows: daily } = await tx.execute<CardAnalytics['daily'][number]>(sql`select to_char(d.day, 'YYYY-MM-DD') as day,
        count(e.id) filter (where e.kind = 'view')::int as views, count(e.id) filter (where e.kind = 'save')::int as saves,
        count(e.id) filter (where e.kind = 'action')::int as actions, count(e.id) filter (where e.kind = 'contact')::int as contacts
      from generate_series(${query.from}::date, ${query.to}::date, interval '1 day') d(day)
      left join qrconnect.card_events e on ${filters} and e.occurred_at >= d.day and e.occurred_at < d.day + interval '1 day'
      group by d.day order by d.day`);
    const { rows: actionRows } = await tx.execute<{ target: string; total: number }>(sql`select target, count(*)::int as total
      from qrconnect.card_events e where ${filters} and ${range(query.from, query.to)} and kind = 'action' and target is not null
      group by target order by total desc, target`);
    const known = cardActions(card.published ?? card.draft);
    const breakdown = async (column: 'device_type' | 'country') => Object.fromEntries((await tx.execute<{ key: string | null; total: number }>(
      sql`select ${sql.raw(column)} as key, count(*)::int as total from qrconnect.card_events e
        where ${filters} and ${range(query.from, query.to)} and kind = 'view' group by 1 order by total desc, key limit 20`)).rows
      .map(row => [row.key ?? 'Unknown', row.total]));
    return {
      card: { id: card.id, title: card.title, slug: card.slug }, query, summary, previous, daily,
      actions: actionRows.map(row => { const action = known.find(item => item.target === row.target);
        return { target: row.target, kind: action?.kind ?? 'removed', label: action?.label ?? 'Removed action', total: row.total }; }),
      devices: await breakdown('device_type'), countries: await breakdown('country'),
    };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}

export function cardAnalyticsCsv(data: CardAnalytics) {
  const lines = [['date', 'views', 'saves', 'actions', 'contacts'].join(',')];
  for (const day of data.daily) lines.push([csvCell(day.day), day.views, day.saves, day.actions, day.contacts].join(','));
  lines.push('', ['action', 'total'].join(','));
  for (const action of data.actions) lines.push([csvCell(action.label), action.total].join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
