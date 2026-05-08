"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { io as createIo, type Socket } from "socket.io-client";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useMenuStore, type ApiMenuCategory, type ApiMenuItem } from "@/store/menuStore";
import { useTableStore } from "@/store/tableStore";
import type { ApiOrder } from "@/store/orderStore";

type OrderStage = "new" | "cooking" | "ready" | "completed";

type RestaurantConfig = {
  tax_rate: number;
  currency: string;
};

type DraftLine = {
  quantity: number;
  specialNote: string;
};

const COLUMNS: Array<{ key: OrderStage; title: string }> = [
  { key: "new", title: "New" },
  { key: "cooking", title: "Cooking" },
  { key: "ready", title: "Ready" },
  { key: "completed", title: "Completed" },
];

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function badgeVariantForStatus(status: ApiOrder["status"]) {
  switch (status) {
    case "new":
      return "warning";
    case "cooking":
      return "info";
    case "ready":
      return "success";
    case "completed":
      return "neutral";
    case "cancelled":
      return "danger";
  }
}

function labelForStatus(status: ApiOrder["status"]) {
  switch (status) {
    case "new":
      return "New";
    case "cooking":
      return "Cooking";
    case "ready":
      return "Ready";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

function nextStatus(status: ApiOrder["status"]): OrderStage | null {
  switch (status) {
    case "new":
      return "cooking";
    case "cooking":
      return "ready";
    case "ready":
      return "completed";
    default:
      return null;
  }
}

function actionLabel(status: ApiOrder["status"]) {
  switch (status) {
    case "new":
      return "Start Cooking";
    case "cooking":
      return "Mark Ready";
    case "ready":
      return "Complete";
    default:
      return "";
  }
}

function elapsedLabel(iso: string, nowMs: number) {
  const diffMs = Math.max(0, nowMs - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ago`;
}

function timestampLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function orderSubtotal(order: ApiOrder) {
  return order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

function groupedMenuItems(
  categories: ApiMenuCategory[],
  items: ApiMenuItem[]
): Array<{ category: ApiMenuCategory; items: ApiMenuItem[] }> {
  return categories
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((category) => ({
      category,
      items: items
        .filter((item) => item.category_id === category.id && item.available === 1)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.items.length > 0);
}

export default function OrdersPage() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tables = useTableStore((state) => state.tables);
  const fetchTables = useTableStore((state) => state.fetchTables);
  const menuCategories = useMenuStore((state) => state.categories);
  const menuItems = useMenuStore((state) => state.items);
  const fetchMenu = useMenuStore((state) => state.fetchMenu);

  const [orders, setOrders] = React.useState<ApiOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);
  const [loadingConfig, setLoadingConfig] = React.useState(true);
  const [config, setConfig] = React.useState<RestaurantConfig>({
    tax_rate: 10,
    currency: "USD",
  });
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [highlightedIds, setHighlightedIds] = React.useState<string[]>([]);
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<ApiOrder | null>(null);

  const [newOrderOpen, setNewOrderOpen] = React.useState(false);
  const [newOrderStep, setNewOrderStep] = React.useState<1 | 2 | 3>(1);
  const [selectedTableId, setSelectedTableId] = React.useState("");
  const [draftLines, setDraftLines] = React.useState<Record<string, DraftLine>>({});
  const [orderNotes, setOrderNotes] = React.useState("");
  const [placingOrder, setPlacingOrder] = React.useState(false);

  const socketRef = React.useRef<Socket | null>(null);
  const [mobileStage, setMobileStage] = React.useState<OrderStage>("new");

  const upsertOrder = React.useCallback((incoming: ApiOrder) => {
    setOrders((current) => {
      const next = current.filter((order) => order.id !== incoming.id);
      return [incoming, ...next].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, []);

  const removeOrder = React.useCallback((orderId: string) => {
    setOrders((current) => current.filter((order) => order.id !== orderId));
  }, []);

  const flashOrder = React.useCallback((orderId: string) => {
    setHighlightedIds((current) => (current.includes(orderId) ? current : [...current, orderId]));
    window.setTimeout(() => {
      setHighlightedIds((current) => current.filter((id) => id !== orderId));
    }, 2000);
  }, []);

  const loadOrders = React.useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/orders", {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as ApiOrder[] | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error ?? `Failed (${res.status})` : `Failed (${res.status})`);
      }
      setOrders((data as ApiOrder[]).filter((order) => order.status !== "cancelled"));
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Orders failed",
        message: (e as Error).message,
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [toast]);

  const loadConfig = React.useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch("/api/config", {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as RestaurantConfig | { error?: string } | null;
      if (!res.ok) {
        throw new Error(
          data && typeof data === "object" && "error" in data
            ? data.error ?? `Failed (${res.status})`
            : `Failed (${res.status})`
        );
      }
      if (data && !("error" in (data as object))) {
        setConfig({
          tax_rate: (data as RestaurantConfig).tax_rate ?? 10,
          currency: (data as RestaurantConfig).currency ?? "USD",
        });
      }
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Config failed",
        message: (e as Error).message,
      });
    } finally {
      setLoadingConfig(false);
    }
  }, [toast]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([fetchTables(), fetchMenu(), loadOrders(), loadConfig()]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchMenu, fetchTables, loadConfig, loadOrders]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const hostname = window.location.hostname || "localhost";
    const socket = createIo(`ws://${hostname}:3000/kitchen`, {
      transports: ["websocket"],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("new_order", (order: ApiOrder) => {
      upsertOrder(order);
      flashOrder(order.id);
    });

    socket.on("order_updated", (order: ApiOrder) => {
      if (order.status === "cancelled") {
        removeOrder(order.id);
        return;
      }
      upsertOrder(order);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [flashOrder, removeOrder, upsertOrder]);

  const availableTables = React.useMemo(
    () => tables.filter((table) => table.status === "available"),
    [tables]
  );

  const menuGroups = React.useMemo(
    () => groupedMenuItems(menuCategories, menuItems),
    [menuCategories, menuItems]
  );

  const activeOrders = React.useMemo(
    () => orders.filter((order) => order.status !== "cancelled"),
    [orders]
  );

  const ordersByStatus = React.useMemo(() => {
    return COLUMNS.reduce<Record<OrderStage, ApiOrder[]>>(
      (acc, column) => {
        acc[column.key] = activeOrders
          .filter((order) => order.status === column.key)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return acc;
      },
      { new: [], cooking: [], ready: [], completed: [] }
    );
  }, [activeOrders]);

  const selectedLines = React.useMemo(() => {
    return Object.entries(draftLines)
      .map(([id, line]) => {
        const menuItem = menuItems.find((item) => item.id === id);
        if (!menuItem || line.quantity <= 0) return null;
        return { menuItem, quantity: line.quantity, specialNote: line.specialNote };
      })
      .filter(Boolean) as Array<{
      menuItem: ApiMenuItem;
      quantity: number;
      specialNote: string;
    }>;
  }, [draftLines, menuItems]);

  const reviewSubtotal = React.useMemo(
    () => selectedLines.reduce((sum, line) => sum + line.menuItem.price * line.quantity, 0),
    [selectedLines]
  );
  const reviewTax = React.useMemo(
    () => (reviewSubtotal * config.tax_rate) / 100,
    [config.tax_rate, reviewSubtotal]
  );
  const reviewGrandTotal = reviewSubtotal + reviewTax;
  const selectedOrder =
    selectedOrderId !== null
      ? orders.find((order) => order.id === selectedOrderId) ?? null
      : null;

  React.useEffect(() => {
    const action = searchParams.get("action");
    if (action !== "new") return;
    resetNewOrderModal();
    setNewOrderOpen(true);
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, searchParams]);

  function resetNewOrderModal() {
    setNewOrderStep(1);
    setSelectedTableId(availableTables[0] ? String(availableTables[0].id) : "");
    setDraftLines({});
    setOrderNotes("");
  }

  function openNewOrderModal() {
    resetNewOrderModal();
    setNewOrderOpen(true);
  }

  function updateDraftQuantity(menuItemId: string, delta: number) {
    setDraftLines((current) => {
      const existing = current[menuItemId] ?? { quantity: 0, specialNote: "" };
      const nextQuantity = existing.quantity + delta;
      if (nextQuantity <= 0) {
        const copy = { ...current };
        delete copy[menuItemId];
        return copy;
      }
      return {
        ...current,
        [menuItemId]: { ...existing, quantity: nextQuantity },
      };
    });
  }

  function updateDraftNote(menuItemId: string, specialNote: string) {
    setDraftLines((current) => ({
      ...current,
      [menuItemId]: {
        quantity: current[menuItemId]?.quantity ?? 1,
        specialNote,
      },
    }));
  }

  async function patchOrderStatus(order: ApiOrder, status: ApiOrder["status"]) {
    const previous = order;
    const optimistic: ApiOrder = {
      ...order,
      status,
      updated_at: new Date().toISOString(),
      cooking_at:
        status === "cooking" ? order.cooking_at ?? new Date().toISOString() : order.cooking_at,
      ready_at: status === "ready" ? order.ready_at ?? new Date().toISOString() : order.ready_at,
      completed_at:
        status === "completed"
          ? order.completed_at ?? new Date().toISOString()
          : order.completed_at,
      cancelled_at:
        status === "cancelled"
          ? order.cancelled_at ?? new Date().toISOString()
          : order.cancelled_at,
    };

    if (status === "cancelled") {
      removeOrder(order.id);
    } else {
      upsertOrder(optimistic);
    }

    setPendingActionId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as ApiOrder | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error ?? `Failed (${res.status})` : `Failed (${res.status})`);
      }

      const updated = data as ApiOrder;
      if (updated.status === "cancelled") {
        removeOrder(updated.id);
      } else {
        upsertOrder(updated);
      }

      if (selectedOrderId === updated.id && updated.status === "cancelled") {
        setSelectedOrderId(null);
      }
      void fetchTables();
    } catch (e) {
      upsertOrder(previous);
      toast.pushToast({
        variant: "error",
        title: "Status failed",
        message: (e as Error).message,
      });
    } finally {
      setPendingActionId(null);
    }
  }

  async function handlePlaceOrder() {
    if (!selectedTableId) {
      toast.pushToast({
        variant: "error",
        title: "Select a table",
        message: "Choose an available table first.",
      });
      return;
    }

    if (selectedLines.length === 0) {
      toast.pushToast({
        variant: "error",
        title: "No items selected",
        message: "Add at least one menu item before placing the order.",
      });
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          items: selectedLines.map((line) => ({
            menuItemId: line.menuItem.id,
            quantity: line.quantity,
            unitPrice: line.menuItem.price,
            specialNote: line.specialNote.trim() || undefined,
          })),
          notes: orderNotes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as ApiOrder | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error ?? `Failed (${res.status})` : `Failed (${res.status})`);
      }

      const created = data as ApiOrder;
      upsertOrder(created);
      flashOrder(created.id);
      setNewOrderOpen(false);
      resetNewOrderModal();
      void fetchTables();
      toast.pushToast({
        variant: "success",
        title: "Order placed",
        message: `Order #${created.id} was created successfully.`,
      });
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Create failed",
        message: (e as Error).message,
      });
    } finally {
      setPlacingOrder(false);
    }
  }

  const boardLoading = loadingOrders || loadingConfig;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-bold tracking-tight text-foreground">
            Order Management
          </div>
          <div className="mt-1 text-sm text-secondary/70">
            Live kanban board backed by SQLite and Socket.IO.
          </div>
        </div>

        <Button variant="primary" onClick={openNewOrderModal}>
          New Order
        </Button>
      </div>

      {boardLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-3xl" />
              <Skeleton className="h-56 w-full rounded-3xl" />
            </div>
          ))}
        </div>
      ) : activeOrders.length === 0 ? (
        <EmptyState
          title="No active orders"
          description="Create a new walk-in order or wait for customer orders to arrive."
          cta={{ label: "New Order", variant: "primary" }}
          onCta={openNewOrderModal}
        />
      ) : (
        <div className="space-y-4">
          <div className="md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {COLUMNS.map((col) => {
                const active = mobileStage === col.key;
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setMobileStage(col.key)}
                    className={[
                      "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-primary/35 bg-primary/15 text-primary"
                        : "border-secondary/15 bg-white text-secondary/80 hover:bg-secondary/5",
                    ].join(" ")}
                  >
                    {col.title} ({ordersByStatus[col.key].length})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              className={[
                "space-y-3",
                column.key !== mobileStage ? "hidden md:block" : "",
              ].join(" ")}
            >
              <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold tracking-tight text-foreground">
                    {column.title}
                  </div>
                  <Badge variant={badgeVariantForStatus(column.key)}>
                    {ordersByStatus[column.key].length}
                  </Badge>
                </div>
              </div>

              {ordersByStatus[column.key].length === 0 ? (
                <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-6 text-sm text-secondary/60">
                  No orders
                </div>
              ) : null}

              {ordersByStatus[column.key].map((order) => {
                const subtotal = orderSubtotal(order);
                const next = nextStatus(order.status);
                const isHighlighted = highlightedIds.includes(order.id);
                return (
                  <Card
                    key={order.id}
                    className={[
                      "cursor-pointer p-4 transition-all",
                      isHighlighted ? "order-flash ring-2 ring-success/30" : "",
                    ].join(" ")}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black tracking-tight text-foreground">
                          Order #{order.id}
                        </div>
                        <div className="mt-1 text-sm text-secondary/70">
                          {order.tableName ?? (order.table_id ? `Table ${order.table_id}` : "No table")}
                        </div>
                      </div>
                      <Badge variant={badgeVariantForStatus(order.status)}>
                        {labelForStatus(order.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-secondary/80">
                      {order.items.map((item) => (
                        <div key={item.id}>
                          {item.quantity}x {item.itemName ?? "Item"}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="text-secondary/60">
                        {elapsedLabel(order.created_at, nowMs)}
                      </div>
                      <div className="font-black tracking-tight text-foreground">
                        {formatMoney(subtotal, config.currency)}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {next ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          disabled={pendingActionId === order.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void patchOrderStatus(order, next);
                          }}
                        >
                          {pendingActionId === order.id ? "Saving..." : actionLabel(order.status)}
                        </Button>
                      ) : null}
                      {order.status !== "completed" ? (
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          disabled={pendingActionId === order.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCancelTarget(order);
                          }}
                        >
                          Cancel Order
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          ))}
          </div>
        </div>
      )}

      <Modal
        open={selectedOrder !== null}
        title={selectedOrder ? `Order #${selectedOrder.id}` : "Order Details"}
        onClose={() => setSelectedOrderId(null)}
        className="max-w-5xl"
      >
        {selectedOrder ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-secondary/60">Table</div>
                <div className="text-lg font-black tracking-tight text-foreground">
                  {selectedOrder.tableName ??
                    (selectedOrder.table_id ? `Table ${selectedOrder.table_id}` : "No table")}
                </div>
              </div>
              <Badge variant={badgeVariantForStatus(selectedOrder.status)}>
                {labelForStatus(selectedOrder.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
              <div className="rounded-2xl border border-secondary/10 bg-background p-4">
                <div className="text-sm font-bold tracking-tight text-foreground">Items</div>
                <div className="mt-4 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-secondary/10 bg-white px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {item.quantity}x {item.itemName ?? "Item"}
                          </div>
                          {item.special_note ? (
                            <div className="mt-1 text-xs text-secondary/70">
                              Note: {item.special_note}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-secondary/55">
                              No special notes
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black tracking-tight text-foreground">
                            {formatMoney(item.unit_price * item.quantity, config.currency)}
                          </div>
                          <div className="mt-1 text-xs text-secondary/60">
                            {formatMoney(item.unit_price, config.currency)} each
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-secondary/10 bg-white p-4">
                  <div className="text-sm font-bold tracking-tight text-foreground">Notes</div>
                  <div className="mt-3 text-sm text-secondary/70">
                    {selectedOrder.notes || "No order notes"}
                  </div>
                </div>

                <div className="rounded-2xl border border-secondary/10 bg-white p-4">
                  <div className="text-sm font-bold tracking-tight text-foreground">Totals</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary/70">Subtotal</span>
                      <span className="font-semibold text-foreground">
                        {formatMoney(orderSubtotal(selectedOrder), config.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary/70">Tax ({config.tax_rate}%)</span>
                      <span className="font-semibold text-foreground">
                        {formatMoney(
                          (orderSubtotal(selectedOrder) * config.tax_rate) / 100,
                          config.currency
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base font-black tracking-tight">
                      <span>Grand Total</span>
                      <span>
                        {formatMoney(
                          orderSubtotal(selectedOrder) +
                            (orderSubtotal(selectedOrder) * config.tax_rate) / 100,
                          config.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-secondary/10 bg-white p-4">
                  <div className="text-sm font-bold tracking-tight text-foreground">Timeline</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary/70">Created</span>
                      <span className="font-semibold text-foreground">
                        {timestampLabel(selectedOrder.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary/70">Started Cooking</span>
                      <span className="font-semibold text-foreground">
                        {timestampLabel(selectedOrder.cooking_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary/70">Ready</span>
                      <span className="font-semibold text-foreground">
                        {timestampLabel(selectedOrder.ready_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary/70">Completed</span>
                      <span className="font-semibold text-foreground">
                        {timestampLabel(selectedOrder.completed_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={cancelTarget !== null}
        title="Cancel Order?"
        onClose={() => setCancelTarget(null)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Keep Order
            </Button>
            <Button
              variant="danger"
              disabled={!cancelTarget || pendingActionId === cancelTarget.id}
              onClick={() => {
                if (!cancelTarget) return;
                const current = cancelTarget;
                setCancelTarget(null);
                void patchOrderStatus(current, "cancelled");
              }}
            >
              Cancel Order
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-secondary/70">
            {cancelTarget ? `Cancel order #${cancelTarget.id}?` : ""}
          </div>
        </div>
      </Modal>

      <Modal
        open={newOrderOpen}
        title="New Order"
        onClose={() => setNewOrderOpen(false)}
        className="max-w-6xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                if (newOrderStep === 1) {
                  setNewOrderOpen(false);
                  return;
                }
                setNewOrderStep((current) => (current - 1) as 1 | 2 | 3);
              }}
            >
              {newOrderStep === 1 ? "Cancel" : "Back"}
            </Button>

            {newOrderStep < 3 ? (
              <Button
                variant="primary"
                onClick={() => {
                  if (newOrderStep === 1 && !selectedTableId) {
                    toast.pushToast({
                      variant: "error",
                      title: "Select a table",
                      message: "Choose an available table before continuing.",
                    });
                    return;
                  }
                  if (newOrderStep === 2 && selectedLines.length === 0) {
                    toast.pushToast({
                      variant: "error",
                      title: "Add items",
                      message: "Choose at least one item before continuing.",
                    });
                    return;
                  }
                  setNewOrderStep((current) => (current + 1) as 1 | 2 | 3);
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={placingOrder}
                onClick={() => void handlePlaceOrder()}
              >
                {placingOrder ? "Placing..." : "Place Order"}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={[
                  "rounded-full px-3 py-1 text-sm font-semibold",
                  newOrderStep === step
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary/5 text-secondary/70",
                ].join(" ")}
              >
                Step {step}
              </div>
            ))}
          </div>

          {newOrderStep === 1 ? (
            <div className="space-y-4">
              <div>
                <div className="text-base font-bold tracking-tight text-foreground">
                  Select Table
                </div>
                <div className="mt-1 text-sm text-secondary/70">
                  Only currently available tables are shown here.
                </div>
              </div>
              <div className="max-w-md">
                <div className="text-sm font-semibold text-secondary/70">Available Table</div>
                <select
                  value={selectedTableId}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <option value="">Select a table</option>
                  {availableTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} · {table.capacity} seats
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {newOrderStep === 2 ? (
            <div className="space-y-4">
              <div>
                <div className="text-base font-bold tracking-tight text-foreground">
                  Add Items
                </div>
                <div className="mt-1 text-sm text-secondary/70">
                  Choose menu items and quantities for this order.
                </div>
              </div>

              <div className="max-h-[60vh] space-y-5 overflow-auto pr-1">
                {menuGroups.map((group) => (
                  <div key={group.category.id} className="space-y-3">
                    <div className="text-sm font-black tracking-tight text-foreground">
                      {group.category.name}
                    </div>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {group.items.map((item) => {
                        const line = draftLines[item.id] ?? { quantity: 0, specialNote: "" };
                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-secondary/10 bg-background p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {item.name}
                                </div>
                                <div className="mt-1 text-xs text-secondary/60">
                                  {item.description || "No description"}
                                </div>
                              </div>
                              <div className="text-sm font-black tracking-tight text-foreground">
                                {formatMoney(item.price, config.currency)}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateDraftQuantity(item.id, -1)}
                                  disabled={line.quantity <= 0}
                                  className="h-9 w-9 rounded-2xl border border-secondary/15 bg-white text-secondary/70 disabled:opacity-50"
                                >
                                  -
                                </button>
                                <div className="flex h-9 min-w-10 items-center justify-center rounded-2xl border border-secondary/10 bg-white font-bold text-secondary/80">
                                  {line.quantity}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateDraftQuantity(item.id, 1)}
                                  className="h-9 w-9 rounded-2xl border border-secondary/15 bg-white text-secondary/70"
                                >
                                  +
                                </button>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => updateDraftQuantity(item.id, 1)}
                              >
                                Add
                              </Button>
                            </div>

                            {line.quantity > 0 ? (
                              <div className="mt-3">
                                <div className="text-xs font-semibold text-secondary/60">
                                  Special note
                                </div>
                                <textarea
                                  value={line.specialNote}
                                  onChange={(event) =>
                                    updateDraftNote(item.id, event.target.value)
                                  }
                                  placeholder="Optional"
                                  className="mt-2 min-h-[44px] w-full rounded-2xl border border-secondary/15 bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {newOrderStep === 3 ? (
            <div className="space-y-4">
              <div>
                <div className="text-base font-bold tracking-tight text-foreground">
                  Review Order
                </div>
                <div className="mt-1 text-sm text-secondary/70">
                  Confirm table, items, and totals before placing the order.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
                <div className="rounded-2xl border border-secondary/10 bg-background p-4">
                  <div className="text-sm font-semibold text-secondary/70">
                    Table
                  </div>
                  <div className="mt-1 text-base font-black tracking-tight text-foreground">
                    {tables.find((table) => String(table.id) === selectedTableId)?.name || "No table selected"}
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedLines.map((line) => (
                      <div
                        key={line.menuItem.id}
                        className="rounded-2xl border border-secondary/10 bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {line.quantity}x {line.menuItem.name}
                            </div>
                            {line.specialNote ? (
                              <div className="mt-1 text-xs text-secondary/70">
                                Note: {line.specialNote}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-sm font-black tracking-tight text-foreground">
                            {formatMoney(
                              line.menuItem.price * line.quantity,
                              config.currency
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-secondary/10 bg-white p-4">
                    <Input
                      label="Order Notes"
                      value={orderNotes}
                      onChange={(event) => setOrderNotes(event.target.value)}
                      placeholder="Optional notes for staff"
                    />
                  </div>

                  <div className="rounded-2xl border border-secondary/10 bg-white p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary/70">Subtotal</span>
                        <span className="font-semibold text-foreground">
                          {formatMoney(reviewSubtotal, config.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary/70">Tax ({config.tax_rate}%)</span>
                        <span className="font-semibold text-foreground">
                          {formatMoney(reviewTax, config.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-base font-black tracking-tight">
                        <span>Grand Total</span>
                        <span>{formatMoney(reviewGrandTotal, config.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <style jsx global>{`
        @keyframes order-flash {
          0% {
            background-color: rgba(34, 197, 94, 0.18);
          }
          100% {
            background-color: transparent;
          }
        }

        .order-flash {
          animation: order-flash 2s ease-out;
        }
      `}</style>
    </div>
  );
}
