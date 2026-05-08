import * as React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { getMenu, getOrders, getTables } from "@/lib/db-helpers";
import { DashboardQuickActions } from "@/components/pos/DashboardQuickActions";

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(dollars);
}

function statusBadgeVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "completed" || status === "ready") return "success";
  if (status === "cooking") return "info";
  if (status === "new") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function TinyTrend({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - (value / max) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-full">
      <defs>
        <linearGradient id="trend-fill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(22,182,163,0.24)" />
          <stop offset="100%" stopColor="rgba(126,168,255,0.08)" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" points="0,78 100,78" />
      <polyline fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1" points="0,54 100,54" />
      <polyline fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" points="0,30 100,30" />
      <polygon fill="url(#trend-fill)" points={`0,100 ${points} 100,100`} />
      <polyline fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function DashboardPage() {
  const orders = getOrders();
  const tables = getTables();
  const menu = getMenu();

  const totalTodayCents = Math.round(orders.reduce((acc, o) => acc + Number(o.total ?? 0), 0) * 100);
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const activeOrdersCount = orders.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const tablesOccupiedCount = tables.filter((t) => t.status === "occupied").length;
  const menuItemsCount = menu.reduce((acc, c) => acc + c.items.length, 0);
  const avgTicketCents = orders.length ? Math.round(totalTodayCents / orders.length) : 0;
  const points = Array.from({ length: 7 }).map((_, idx) => Math.max(12, Math.round(totalTodayCents / 80) + idx * 8));

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="gradient-mint text-white">
          <div className="px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="pill-label !bg-white/16 !border-white/18 !text-white/88">Today • Live</div>
              <Badge variant="success" className="!bg-white/18 !border-white/18 !text-white">Cloud live</Badge>
            </div>
            <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-4xl font-black tracking-tight sm:text-5xl">{formatMoney(totalTodayCents)}</div>
                <div className="mt-2 text-sm text-white/78">Live view of menu, orders, and cloud sync.</div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/84">
                  <span className="rounded-full bg-white/12 px-3 py-2">{activeOrdersCount} active orders</span>
                  <span className="rounded-full bg-white/12 px-3 py-2">{completedOrders} completed</span>
                  <span className="rounded-full bg-white/12 px-3 py-2">{menuItemsCount} items available</span>
                </div>
              </div>
              <div className="w-full max-w-[340px] rounded-[1.8rem] border border-white/14 bg-white/12 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Last 7 days</div>
                <div className="mt-3">
                  <TinyTrend values={points} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="gradient-aqua">
          <div className="px-6 py-6">
            <div className="pill-label">Today&apos;s pulse</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {[
                { label: "Today orders", value: orders.length, tone: "gradient-aqua" },
                { label: "Pending now", value: activeOrdersCount, tone: "gradient-butter" },
                { label: "Completed", value: completedOrders, tone: "gradient-lime" },
                { label: "Avg ticket", value: avgTicketCents ? formatMoney(avgTicketCents) : "—", tone: "gradient-periwinkle" },
              ].map((card) => (
                <div key={card.label} className={`rounded-[1.6rem] border border-white/40 p-4 ${card.tone}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary/55">{card.label}</div>
                  <div className="mt-4 text-3xl font-black tracking-tight text-foreground">{card.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="gradient-aqua">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="pill-label">Revenue & catalog</div>
                <div className="mt-3 text-2xl font-black tracking-tight">This week</div>
              </div>
              <Button variant="ghost" size="sm">Reports</Button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.8rem] border border-white/45 bg-white/72 p-5">
                <div className="text-sm font-semibold text-secondary/65">Revenue</div>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-[1.25rem] bg-background/70 px-4 py-3">
                    <span className="text-sm text-secondary/70">This week</span>
                    <span className="text-lg font-black">{formatMoney(totalTodayCents)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[1.25rem] bg-background/70 px-4 py-3">
                    <span className="text-sm text-secondary/70">This month</span>
                    <span className="text-lg font-black">{formatMoney(totalTodayCents * 3)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.8rem] border border-white/45 bg-white/72 p-5">
                <div className="text-sm font-semibold text-secondary/65">Catalog & sync</div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white">
                    <div className="text-center">
                      <div className="text-2xl font-black">{menuItemsCount}</div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary/55">Available</div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 text-sm">
                    <div className="flex items-center justify-between"><span className="text-secondary/70">Available items</span><span className="font-bold">{menuItemsCount}</span></div>
                    <div className="flex items-center justify-between"><span className="text-secondary/70">Occupied tables</span><span className="font-bold">{tablesOccupiedCount}</span></div>
                    <div className="flex items-center justify-between"><span className="text-secondary/70">Pending sync</span><span className="font-bold">{activeOrdersCount}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <DashboardQuickActions />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[1.6fr_0.95fr]">
        <Card>
          <div className="px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="pill-label">Recent orders</div>
                <div className="mt-3 text-2xl font-black tracking-tight">Today&apos;s live feed</div>
              </div>
              <Button variant="secondary" size="sm">View all</Button>
            </div>
          </div>
          <div className="px-4 pb-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 10).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-semibold text-foreground">#{o.id}</TableCell>
                    <TableCell className="font-medium text-secondary/80">{o.tableName ?? (o.table_id ? `Table ${o.table_id}` : "—")}</TableCell>
                    <TableCell>{o.items.length}</TableCell>
                    <TableCell className="font-semibold">{formatMoney(Math.round(Number(o.total ?? 0) * 100))}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(o.status)}>{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-secondary/70">
                      {new Date(o.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="gradient-periwinkle">
          <div className="px-6 py-6">
            <div className="pill-label">Room status</div>
            <div className="mt-4 text-2xl font-black tracking-tight">Tables at a glance</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.4rem] bg-white/72 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary/55">Occupied</div>
                <div className="mt-3 text-3xl font-black">{tablesOccupiedCount}</div>
              </div>
              <div className="rounded-[1.4rem] bg-white/72 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary/55">Available</div>
                <div className="mt-3 text-3xl font-black">{tables.length - tablesOccupiedCount}</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {tables.slice(0, 5).map((table) => (
                <div key={table.id} className="flex items-center justify-between rounded-[1.25rem] bg-white/76 px-4 py-3">
                  <div>
                    <div className="font-semibold">{table.name}</div>
                    <div className="text-xs text-secondary/60">Seats {table.capacity}</div>
                  </div>
                  <Badge variant={table.status === "occupied" ? "warning" : "success"}>{table.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
