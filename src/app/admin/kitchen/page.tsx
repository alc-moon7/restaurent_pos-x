"use client";

import * as React from "react";
import { Badge, Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { io as createIo, type Socket } from "socket.io-client";

type Stage = "new" | "cooking" | "ready";

type KitchenOrder = {
  id: number;
  table_id: number | null;
  tableName: string | null;
  status: "new" | "cooking" | "ready" | "completed" | "cancelled";
  created_at: string;
  items: Array<{ id: number; quantity: number; itemName: string | null; special_note: string | null }>;
};

function stageLabel(stage: Stage) {
  return stage === "new" ? "New" : stage === "cooking" ? "Cooking" : "Ready";
}

function beep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    window.setTimeout(() => {
      o.stop();
      ctx.close().catch(() => {});
    }, 110);
  } catch {
    // ignore
  }
}

function elapsedLabel(createdAt: string, nowMs: number) {
  const ms = nowMs - new Date(createdAt).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}

export default function KitchenPage() {
  const toast = useToast();

  const [orders, setOrders] = React.useState<KitchenOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [kitchenMode, setKitchenMode] = React.useState(false);

  const socketRef = React.useRef<Socket | null>(null);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = (await res.json()) as KitchenOrder[];
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setOrders(data.filter((o) => o.status === "new" || o.status === "cooking" || o.status === "ready"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => void fetchOrders(), 0);
    return () => window.clearTimeout(t);
  }, [fetchOrders]);

  React.useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  React.useEffect(() => {
    const hostname = window.location.hostname || "localhost";
    const s = createIo(`http://${hostname}:3000/kitchen`, {
      transports: ["websocket"],
      autoConnect: true,
    });
    socketRef.current = s;

    s.on("new_order", (order: KitchenOrder) => {
      beep();
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    });

    s.on("order_updated", () => {
      window.setTimeout(() => void fetchOrders(), 0);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [fetchOrders]);

  const move = async (orderId: number, status: "new" | "cooking" | "ready" | "completed") => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      await fetchOrders();
    } catch (e) {
      toast.pushToast({ variant: "error", title: "Update failed", message: (e as Error).message });
    }
  };

  const cols: Array<{ stage: Stage; className: string }> = [
    { stage: "new", className: "bg-warning/10 border-warning/25" },
    { stage: "cooking", className: "bg-info/10 border-info/25" },
    { stage: "ready", className: "bg-success/10 border-success/25" },
  ];

  const listFor = (s: Stage) => orders.filter((o) => o.status === s).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className={kitchenMode ? "min-h-screen bg-background p-4" : "min-h-screen bg-background p-4 md:p-6"}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-black tracking-tight text-foreground">Kitchen Display</div>
          <div className="mt-1 text-sm text-secondary/70">
            Live orders • Tablet-optimized
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchOrders}>
            Refresh
          </Button>
          <Button
            variant={kitchenMode ? "primary" : "secondary"}
            onClick={async () => {
              const next = !kitchenMode;
              setKitchenMode(next);
              if (next) {
                try {
                  await document.documentElement.requestFullscreen();
                } catch {
                  // ignore
                }
              } else if (document.fullscreenElement) {
                try {
                  await document.exitFullscreen();
                } catch {
                  // ignore
                }
              }
            }}
          >
            Kitchen Mode
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-secondary/70">Loading…</div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger flex items-center justify-between gap-4">
          <div className="min-w-0 truncate">{error}</div>
          <Button variant="secondary" size="sm" onClick={fetchOrders}>Retry</Button>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {cols.map((c) => {
          const list = listFor(c.stage);
          return (
            <div key={c.stage} className="space-y-3">
              <div className={["rounded-2xl border px-4 py-3 flex items-center justify-between gap-3", c.className].join(" ")}>
                <div className="text-sm font-bold tracking-tight">{stageLabel(c.stage)}</div>
                <Badge variant={c.stage === "ready" ? "success" : c.stage === "cooking" ? "info" : "warning"}>{list.length}</Badge>
              </div>

              <div className="space-y-3">
                {list.map((o) => {
                  const tableName = o.tableName ?? (o.table_id ? `Table ${o.table_id}` : "—");
                  return (
                    <div key={o.id} className="rounded-3xl border border-secondary/10 bg-white shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xl font-black tracking-tight truncate">{tableName}</div>
                          <div className="mt-1 text-xs text-secondary/60 font-semibold">#{o.id} • {elapsedLabel(o.created_at, nowMs)}</div>
                        </div>
                        <div className="shrink-0">
                          <Badge variant={c.stage === "ready" ? "success" : c.stage === "cooking" ? "info" : "warning"}>{stageLabel(c.stage)}</Badge>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {o.items.map((it) => (
                          <div key={it.id} className="text-sm">
                            <div className="font-semibold text-foreground">
                              {it.quantity}x {it.itemName ?? "Item"}
                            </div>
                            {it.special_note ? (
                              <div className="text-xs text-secondary/70 mt-0.5">Note: {it.special_note}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        {o.status === "new" ? (
                          <Button variant="secondary" size="sm" className="flex-1" onClick={() => move(o.id, "cooking")}>
                            Start Cooking
                          </Button>
                        ) : null}
                        {o.status === "cooking" ? (
                          <Button variant="secondary" size="sm" className="flex-1" onClick={() => move(o.id, "ready")}>
                            Mark Ready
                          </Button>
                        ) : null}
                        {o.status === "ready" ? (
                          <Button variant="primary" size="sm" className="flex-1" onClick={() => move(o.id, "completed")}>
                            Complete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

