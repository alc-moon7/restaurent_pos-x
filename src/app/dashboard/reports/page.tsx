/* eslint-disable react/no-unescaped-entities */
"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type RangeKey = "today" | "week" | "month" | "custom";

type ReportsResponse = {
  kpi: {
    range: RangeKey;
    fromDate: string;
    toDate: string;
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    avgOrderValue: number;
    topSellingItem: { name: string; unitsSold: number } | null;
  };
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  topItems: Array<{ name: string; category: string; unitsSold: number; revenue: number }>;
  hourlyTraffic: Array<{ hour: string; orders: number }>;
};

function formatMoneyFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function DonutSegmented({
  segments,
  size = 120,
}: {
  segments: Array<{ pct: number; color: string; label: string }>;
  size?: number;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox="0 0 120 120" className="relative">
        <circle cx="60" cy="60" r={r} stroke="rgba(26,26,46,0.08)" strokeWidth="12" fill="none" />
        {segments.map((s, idx) => {
          const startPct = segments.slice(0, idx).reduce((acc, x) => acc + x.pct, 0);
          const dash = c * s.pct;
          const dasharray = `${dash} ${c - dash}`;
          const strokeDashoffset = -c * startPct;
          return (
            <circle
              key={s.label}
              cx="60"
              cy="60"
              r={r}
              stroke={s.color}
              strokeWidth="12"
              fill="none"
              strokeDasharray={dasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          );
        })}
        <text x="60" y="62" textAnchor="middle" className="font-black text-sm fill-foreground">
          {Math.round(segments[0]?.pct * 100)}%
        </text>
      </svg>
    </div>
  );
}

function barHeight(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}

export default function ReportsPage() {
  const toast = useToast();

  const [rangeKey, setRangeKey] = React.useState<RangeKey>("today");
  const today = React.useMemo(() => new Date(), []);
  const [customStart, setCustomStart] = React.useState(
    toISODate(new Date(today.getTime() - 6 * 86400000))
  );
  const [customEnd, setCustomEnd] = React.useState(toISODate(today));

  const [loading, setLoading] = React.useState(true);
  const [reports, setReports] = React.useState<ReportsResponse | null>(null);

  const loadReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("range", rangeKey);
      if (rangeKey === "custom") {
        qs.set("from", customStart);
        qs.set("to", customEnd);
      }
      const res = await fetch(`/api/reports?${qs.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as ReportsResponse | { error?: string };
      if (!res.ok) {
        throw new Error("error" in json ? json.error ?? `Failed (${res.status})` : `Failed (${res.status})`);
      }
      setReports(json as ReportsResponse);
    } catch (e) {
      setReports(null);
      toast.pushToast({
        variant: "error",
        title: "Reports failed",
        message: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [customEnd, customStart, rangeKey, toast]);

  React.useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const exportCsv = React.useCallback(() => {
    if (!reports) return;

    const safe = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const lines: string[] = [];

    lines.push("Daily Revenue");
    lines.push(["date", "revenue", "orders"].join(","));
    for (const d of reports.dailyRevenue) {
      lines.push([d.date, (d.revenue / 100).toFixed(2), String(d.orders)].join(","));
    }

    lines.push("");
    lines.push("Top Items");
    lines.push(["name", "category", "units_sold", "revenue"].join(","));
    for (const it of reports.topItems) {
      lines.push([
        safe(it.name),
        safe(it.category ?? ""),
        String(it.unitsSold),
        (it.revenue / 100).toFixed(2),
      ].join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reports.kpi.range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast.pushToast({ variant: "success", title: "CSV exported", message: "Report download started." });
  }, [reports, toast]);

  const maxRevenue = Math.max(...(reports?.dailyRevenue.map((d) => d.revenue) ?? [0]), 0);
  const statusMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const row of reports?.statusBreakdown ?? []) m.set(row.status, row.count);
    return m;
  }, [reports]);

  const statusCompleted = statusMap.get("completed") ?? 0;
  const statusCancelled = statusMap.get("cancelled") ?? 0;
  const statusInProgress =
    (statusMap.get("new") ?? 0) + (statusMap.get("cooking") ?? 0) + (statusMap.get("ready") ?? 0);
  const statusTotal = Math.max(1, statusCompleted + statusInProgress + statusCancelled);

  const segments = [
    { pct: statusCompleted / statusTotal, color: "#28A745", label: "Completed" },
    { pct: statusInProgress / statusTotal, color: "#0ea5e9", label: "In progress" },
    { pct: statusCancelled / statusTotal, color: "#DC3545", label: "Cancelled" },
  ];

  const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hourlyCounts = React.useMemo(() => {
    const byHour = new Map<number, number>();
    for (const row of reports?.hourlyTraffic ?? []) {
      const h = Number(row.hour);
      if (Number.isFinite(h)) byHour.set(h, row.orders);
    }
    return Array.from({ length: 24 }).map((_, h) => byHour.get(h) ?? 0);
  }, [reports]);
  const heatmap = React.useMemo(() => {
    const max = Math.max(1, ...hourlyCounts);
    const intensities = hourlyCounts.map((n) => n / max);
    return Array.from({ length: 7 }).map(() => intensities);
  }, [hourlyCounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xl font-bold tracking-tight text-foreground">Analytics & Reports</div>
          <div className="mt-1 text-sm text-secondary/70">Revenue, order flow, and exports.</div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-2xl border border-secondary/10 bg-white/70 px-2 py-2">
            {(
              [
                ["today", "Today"],
                ["week", "Last 7 days"],
                ["month", "Last 30 days"],
                ["custom", "Custom"],
              ] as const
            ).map(([key, label]) => {
              const active = rangeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRangeKey(key)}
                  className={[
                    "px-3 py-2 rounded-xl text-sm font-semibold border transition-colors",
                    active
                      ? "bg-primary/15 border-primary/35 text-primary"
                      : "bg-white/60 border-secondary/15 text-secondary/80 hover:bg-white border-secondary/20",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {rangeKey === "custom" ? (
            <div className="flex items-center gap-2 rounded-2xl border border-secondary/10 bg-white/70 px-3 py-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-10 rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <span className="text-secondary/60 text-sm font-semibold">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-10 rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          ) : null}

          <Button variant="secondary" onClick={exportCsv} disabled={loading || !reports}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="p-5 rounded-2xl border-secondary/10">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-8 w-32" />
                <Skeleton className="mt-3 h-4 w-20" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="px-6 pt-6">
                <Skeleton className="h-6 w-40" />
                <div className="mt-2">
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <div className="px-6 pb-6 pt-5">
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            </Card>
            <Card>
              <div className="px-6 pt-6">
                <Skeleton className="h-6 w-44" />
                <div className="mt-2">
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <div className="px-6 pb-6 pt-5">
                <Skeleton className="h-40 w-full rounded-2xl" />
              </div>
            </Card>
          </div>
        </div>
      ) : !reports ? (
        <EmptyState
          title="Reports unavailable"
          description="Could not load report data. Please try again."
          cta={{ label: "Retry", variant: "primary" }}
          onCta={() => void loadReports()}
        />
      ) : reports.kpi.totalOrders === 0 ? (
        <EmptyState title="No orders in this period" description="Try a different date range." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 rounded-2xl border-secondary/10">
              <div className="text-sm font-semibold text-secondary/70">Total Revenue</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-foreground">
                {formatMoneyFromCents(Math.round(reports.kpi.totalRevenue * 100))}
              </div>
              <div className="mt-2 text-xs text-secondary/60">Selected period</div>
            </Card>
            <Card className="p-5 rounded-2xl border-secondary/10">
              <div className="text-sm font-semibold text-secondary/70">Total Orders</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-foreground">
                {reports.kpi.totalOrders.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-secondary/60">All channels</div>
            </Card>
            <Card className="p-5 rounded-2xl border-secondary/10">
              <div className="text-sm font-semibold text-secondary/70">Average Order Value</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-foreground">
                {formatMoneyFromCents(Math.round(reports.kpi.avgOrderValue * 100))}
              </div>
              <div className="mt-2 text-xs text-secondary/60">AOV</div>
            </Card>
            <Card className="p-5 rounded-2xl border-secondary/10">
              <div className="text-sm font-semibold text-secondary/70">Top Selling Item</div>
              <div className="mt-2 text-lg font-black tracking-tight text-foreground truncate">
                {reports.kpi.topSellingItem?.name ?? "—"}
              </div>
              <div className="mt-1 text-xs text-secondary/60">
                {reports.kpi.topSellingItem ? `${reports.kpi.topSellingItem.unitsSold} units` : "No data"}
              </div>
            </Card>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="px-6 pt-6">
              <div className="text-base font-bold tracking-tight text-foreground">Sales Chart</div>
              <div className="mt-1 text-sm text-secondary/60">Daily revenue for selected period.</div>
            </div>
            <div className="px-6 pb-6 pt-5">
              <div className="flex items-end gap-3 h-64 rounded-2xl border border-secondary/10 bg-background p-4">
                {reports.dailyRevenue.map((d) => {
                  const h = barHeight(d.revenue, maxRevenue);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className="w-full rounded-xl bg-primary/20 border border-primary/30 shadow-sm"
                        style={{ height: `${h}%` }}
                        aria-hidden="true"
                      />
                      <div className="mt-2 text-[10px] font-semibold text-secondary/60 text-center">
                        {d.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-secondary/60">
                <span>Low</span>
                <span className="font-semibold text-secondary/80">
                  Max {formatMoneyFromCents(Math.round(maxRevenue * 100))}
                </span>
                <span>High</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-6 pt-6">
              <div className="text-base font-bold tracking-tight text-foreground">Order Status Breakdown</div>
              <div className="mt-1 text-sm text-secondary/60">Completed vs in progress vs cancelled.</div>
            </div>
            <div className="px-6 pb-6 pt-5">
              <DonutSegmented segments={segments} />
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#28A745" }} />
                    <span className="text-sm text-secondary/80 font-semibold">Completed</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {Math.round(segments[0].pct * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#0ea5e9" }} />
                    <span className="text-sm text-secondary/80 font-semibold">In progress</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {Math.round(segments[1].pct * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#DC3545" }} />
                    <span className="text-sm text-secondary/80 font-semibold">Cancelled</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {Math.round(segments[2].pct * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <div className="px-6 pt-6">
            <div className="text-base font-bold tracking-tight text-foreground">Top 5 Best-selling Items</div>
            <div className="mt-1 text-sm text-secondary/60">Rank by units sold.</div>
          </div>
          <div className="p-6 pt-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-secondary/70">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 pr-2">Category</th>
                    <th className="py-2 pr-2 text-right">Units</th>
                    <th className="py-2 pr-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.topItems.map((it, idx) => (
                    <tr key={it.name} className="border-t border-secondary/10">
                      <td className="py-3 pr-2 text-sm font-bold text-foreground">{idx + 1}</td>
                      <td className="py-3 pr-2 text-sm font-semibold text-foreground">{it.name}</td>
                      <td className="py-3 pr-2 text-sm text-secondary/70">{it.category}</td>
                      <td className="py-3 pr-2 text-sm text-right font-semibold text-secondary/80">{it.unitsSold}</td>
                      <td className="py-3 pr-2 text-sm text-right font-black tracking-tight text-foreground">
                        {formatMoneyFromCents(Math.round(it.revenue * 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="px-6 pt-6">
            <div className="text-base font-bold tracking-tight text-foreground">Hourly Traffic Heatmap</div>
            <div className="mt-1 text-sm text-secondary/60">Order volume by day and hour (last 7 days).</div>
          </div>
          <div className="px-6 pb-6 pt-5">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[90px_repeat(24,minmax(28px,1fr))] gap-1 items-center">
                <div className="text-xs text-secondary/60 font-semibold px-1">Day</div>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={hour} className="text-[10px] text-secondary/50 font-semibold text-center">
                    {hour}:00
                  </div>
                ))}
                {heatmap.map((row, dayIdx) => (
                  <React.Fragment key={dayIdx}>
                    <div className="text-xs text-secondary/70 font-semibold px-1">
                      {heatmapDays[dayIdx] ?? `Day ${dayIdx + 1}`}
                    </div>
                    {row.map((intensity, hourIdx) => {
                      const alpha = 0.12 + intensity * 0.55;
                      const bg = `rgba(255,107,53,${alpha.toFixed(3)})`;
                      return (
                        <div
                          key={hourIdx}
                          title={`Volume intensity: ${Math.round(intensity * 100)}%`}
                          className="h-7 rounded-lg border border-secondary/10"
                          style={{ backgroundColor: bg }}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-secondary/60">
              <span>Less</span>
              <span className="font-semibold text-secondary/80">More</span>
              <span />
            </div>
          </div>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}

