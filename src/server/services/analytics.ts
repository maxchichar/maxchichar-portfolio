import "server-only";

import { createHmac } from "node:crypto";

import { sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import {
  browserFrom,
  deviceFrom,
  isBot,
  normalizePath,
  referrerHostFrom,
} from "@/lib/analytics";

/**
 * Daily-rotating salt derived from AUTH_SECRET + the UTC date. Nothing is
 * stored, so once the day changes yesterday's hashes can't be recomputed or
 * linked to today's — a visitor is counted at most once per day, never
 * tracked across days.
 */
function visitorHash(ip: string, userAgent: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const secret = process.env.AUTH_SECRET ?? "portfolio-analytics";
  const salt = createHmac("sha256", secret).update(`analytics:${day}`).digest();
  return createHmac("sha256", salt)
    .update(`${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

export async function recordPageView(input: {
  path: unknown;
  referrer: unknown;
  ip: string;
  userAgent: string | null;
  country: string | null;
  siteHost: string | null;
}): Promise<boolean> {
  if (isBot(input.userAgent)) return false;
  const path = normalizePath(input.path);
  if (!path) return false;
  const ua = input.userAgent ?? "";
  const country =
    input.country && /^[A-Z]{2}$/.test(input.country) && input.country !== "XX"
      ? input.country
      : null;

  await db.insert(schema.pageViews).values({
    path,
    referrerHost: referrerHostFrom(
      typeof input.referrer === "string" ? input.referrer : null,
      input.siteHost,
    ),
    country,
    device: deviceFrom(ua),
    browser: browserFrom(ua),
    visitorHash: visitorHash(input.ip, ua),
  });
  return true;
}

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

async function rows(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = (await db.execute(query)) as unknown as { rows: Row[] };
  return result.rows;
}

async function breakdown(column: string, days: number, fallback: string, limit = 8) {
  const col = sql.raw(column);
  const r = await rows(sql`
    select coalesce(${col}, ${fallback}) as label,
           count(*)::int as views,
           count(distinct visitor_hash)::int as visitors
    from page_views
    where created_at >= now() - make_interval(days => ${days})
    group by 1
    order by visitors desc, views desc
    limit ${limit}
  `);
  return r.map((x) => ({
    label: String(x.label),
    views: num(x.views),
    visitors: num(x.visitors),
  }));
}

export async function getAnalyticsSummary(days: AnalyticsRange) {
  const [totals, daily, live, pages, referrers, countries, devices, browsers] =
    await Promise.all([
      rows(sql`
        select
          count(*) filter (where created_at >= now() - make_interval(days => ${days}))::int as views,
          count(distinct visitor_hash) filter (where created_at >= now() - make_interval(days => ${days}))::int as visitors,
          count(*) filter (where created_at < now() - make_interval(days => ${days}))::int as prev_views,
          count(distinct visitor_hash) filter (where created_at < now() - make_interval(days => ${days}))::int as prev_visitors
        from page_views
        where created_at >= now() - make_interval(days => ${days * 2})
      `),
      rows(sql`
        select to_char(d.day, 'YYYY-MM-DD') as day,
               count(p.id)::int as views,
               count(distinct p.visitor_hash)::int as visitors
        from generate_series(
               date_trunc('day', now() at time zone 'utc') - make_interval(days => ${days - 1}),
               date_trunc('day', now() at time zone 'utc'),
               interval '1 day'
             ) as d(day)
        left join page_views p
          on date_trunc('day', p.created_at at time zone 'utc') = d.day
        group by d.day
        order by d.day
      `),
      rows(sql`
        select count(distinct visitor_hash)::int as live
        from page_views where created_at >= now() - interval '5 minutes'
      `),
      breakdown("path", days, "/"),
      breakdown("referrer_host", days, "Direct / none"),
      breakdown("country", days, "Unknown"),
      breakdown("device", days, "desktop", 3),
      breakdown("browser", days, "Other", 6),
    ]);

  const t = totals[0] ?? {};
  return {
    days,
    views: num(t.views),
    visitors: num(t.visitors),
    prevViews: num(t.prev_views),
    prevVisitors: num(t.prev_visitors),
    live: num(live[0]?.live),
    daily: daily.map((d) => ({
      day: String(d.day),
      views: num(d.views),
      visitors: num(d.visitors),
    })),
    pages,
    referrers,
    countries,
    devices,
    browsers,
  };
}

export type AnalyticsSummary = Awaited<ReturnType<typeof getAnalyticsSummary>>;
