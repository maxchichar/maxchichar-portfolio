import Link from "next/link";

import { BarList } from "@/components/admin/analytics/bar-list";
import { StatTile } from "@/components/admin/analytics/stat-tile";
import { TrendChart } from "@/components/admin/analytics/trend-chart";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  ANALYTICS_RANGES,
  getAnalyticsSummary,
  type AnalyticsRange,
} from "@/server/services/analytics";

export const dynamic = "force-dynamic";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryLabel(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  const flag = String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
  return `${flag}  ${regionNames.of(code) ?? code}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days: AnalyticsRange = ANALYTICS_RANGES.includes(Number(range) as AnalyticsRange)
    ? (Number(range) as AnalyticsRange)
    : 30;
  const s = await getAnalyticsSummary(days);
  const perVisitor = s.visitors > 0 ? s.views / s.visitors : 0;
  const prevPerVisitor = s.prevVisitors > 0 ? s.prevViews / s.prevVisitors : 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Analytics"
        description="First-party and cookieless. No IPs or cookies are stored; visitors are counted once per day with a daily-rotating anonymous hash."
      />

      {/* Date range first, one row above everything it scopes. */}
      <nav
        aria-label="Date range"
        className="bg-surface border-border mb-6 inline-flex rounded-full border p-1"
      >
        {ANALYTICS_RANGES.map((r) => (
          <Link
            key={r}
            href={`/admin/analytics?range=${r}`}
            aria-current={r === days ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 font-sans text-xs transition-colors ${
              r === days ? "bg-text text-bg" : "text-text-muted hover:text-text"
            }`}
          >
            Last {r} days
          </Link>
        ))}
      </nav>

      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Visitors"
          value={s.visitors}
          previous={s.prevVisitors}
          note={`vs previous ${days}d`}
        />
        <StatTile
          label="Page views"
          value={s.views}
          previous={s.prevViews}
          note={`vs previous ${days}d`}
        />
        <StatTile
          label="Views per visitor"
          value={perVisitor}
          previous={prevPerVisitor}
          format={(n) => n.toFixed(1)}
          note={`vs previous ${days}d`}
        />
        <StatTile label="Live now" value={s.live} note="active in the last 5 min" live />
      </section>

      <section className="rounded-panel border-border bg-surface mt-4 border p-5 md:p-6">
        <h2 className="text-text font-sans text-sm font-semibold">Traffic</h2>
        <p className="text-text-muted mt-0.5 mb-5 font-sans text-xs">
          Daily visitors and page views (UTC).
        </p>
        <TrendChart data={s.daily} />
        <details className="mt-4">
          <summary className="text-text-muted hover:text-text cursor-pointer font-sans text-xs">
            View as table
          </summary>
          <div className="mt-3 max-h-72 overflow-y-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-text-muted">
                <tr>
                  <th scope="col" className="py-1 font-normal">
                    Day
                  </th>
                  <th scope="col" className="py-1 text-right font-normal">
                    Visitors
                  </th>
                  <th scope="col" className="py-1 text-right font-normal">
                    Views
                  </th>
                </tr>
              </thead>
              <tbody className="text-text tabular-nums">
                {[...s.daily].reverse().map((d) => (
                  <tr key={d.day} className="border-border border-t">
                    <td className="py-1">{d.day}</td>
                    <td className="py-1 text-right">{d.visitors}</td>
                    <td className="py-1 text-right">{d.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList title="Top pages" labelHeader="Page" rows={s.pages} />
        <BarList title="Referrers" labelHeader="Source" rows={s.referrers} />
        <BarList
          title="Countries"
          labelHeader="Country"
          rows={s.countries}
          formatLabel={countryLabel}
        />
        <div className="grid gap-4">
          <BarList
            title="Devices"
            labelHeader="Device"
            rows={s.devices}
            formatLabel={capitalize}
          />
          <BarList title="Browsers" labelHeader="Browser" rows={s.browsers} />
        </div>
      </div>
    </main>
  );
}
