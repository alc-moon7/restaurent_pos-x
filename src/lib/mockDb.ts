import type { MenuItem, Order, OrderItem, OrderStatus, Table } from "@/types";
import { MENU_ITEMS, TABLES } from "@/lib/constants";

export type StaffOrderStage = "new" | "in_progress" | "ready" | "completed";

export type MockOrder = Order & {
  stage: StaffOrderStage;
  timeline: Array<{ stage: StaffOrderStage; at: string }>;
  customerNotes?: string;
};

const ORDERS_KEY = "restopos:mockOrders";
const TABLES_KEY = "restopos:mockTables";

function stageToOrderStatus(stage: StaffOrderStage): OrderStatus {
  switch (stage) {
    case "new":
      return "pending";
    case "in_progress":
      return "accepted";
    case "ready":
      return "ready";
    case "completed":
      return "completed";
  }
}

function ensureSessionTables(): Table[] {
  if (typeof window === "undefined") return [];
  const raw = window.sessionStorage.getItem(TABLES_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Table[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // ignore
    }
  }
  // Seed from constants on first load.
  const seeded = TABLES.map((t) => ({ ...t }));
  window.sessionStorage.setItem(TABLES_KEY, JSON.stringify(seeded));
  return seeded;
}

export function loadTablesFromSession(): Table[] {
  return ensureSessionTables();
}

export function saveTablesToSession(tables: Table[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TABLES_KEY, JSON.stringify(tables));
}

export function loadMenuItemsFromSeed(): MenuItem[] {
  return MENU_ITEMS.map((m) => ({ ...m }));
}

export function loadOrdersFromSession(): MockOrder[] {
  if (typeof window === "undefined") return [];
  const raw = window.sessionStorage.getItem(ORDERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MockOrder[];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

export function saveOrdersToSession(orders: MockOrder[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function createMockOrder(params: {
  restaurantId: string;
  tableId: string;
  tableName: string;
  stage?: StaffOrderStage;
  customerName?: string;
  customerNotes?: string;
  items: Array<{
    menuItemId: string;
    nameSnapshot: string;
    unitPrice: number; // cents
    quantity: number;
    notes?: string;
  }>;
}) {
  const now = new Date().toISOString();
  const stage: StaffOrderStage = params.stage ?? "new";

  const subtotal = params.items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  const orderItems: OrderItem[] = params.items.map((it) => ({
    id: `oi-${now}-${Math.random().toString(16).slice(2)}`,
    orderId: "tmp",
    menuItemId: it.menuItemId,
    nameSnapshot: it.nameSnapshot,
    unitPrice: it.unitPrice,
    quantity: it.quantity,
    notes: it.notes,
  }));

  const id = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const order: MockOrder = {
    id,
    restaurantId: params.restaurantId,
    tableId: params.tableId,
    customerName: params.customerName,
    status: stageToOrderStatus(stage),
    stage,
    items: orderItems.map((it) => ({ ...it, orderId: id })),
    subtotal,
    tax,
    total,
    createdAt: now,
    updatedAt: now,
    servedAt: undefined,
    customerNotes: params.customerNotes,
    timeline: [{ stage, at: now }],
  };

  return order;
}

export function moveOrderStage(order: MockOrder, nextStage: StaffOrderStage): MockOrder {
  const now = new Date().toISOString();
  return {
    ...order,
    stage: nextStage,
    status: stageToOrderStatus(nextStage),
    updatedAt: now,
    servedAt: nextStage === "completed" ? now : undefined,
    timeline: [...order.timeline, { stage: nextStage, at: now }],
  };
}

export function getNextStage(stage: StaffOrderStage): StaffOrderStage | null {
  switch (stage) {
    case "new":
      return "in_progress";
    case "in_progress":
      return "ready";
    case "ready":
      return "completed";
    case "completed":
      return null;
  }
}

export function setTableOccupiedForActiveOrder(tables: Table[], tableId: string): Table[] {
  return tables.map((t) =>
    t.id === tableId
      ? { ...t, status: "occupied" as const, updatedAt: new Date().toISOString() }
      : t
  );
}

export function setTableAvailableIfNoActiveOrder(params: {
  tables: Table[];
  orders: MockOrder[];
  tableId: string;
}): Table[] {
  const hasActive = params.orders.some(
    (o) => o.tableId === params.tableId && o.stage !== "completed"
  );
  if (hasActive) return params.tables;
  return params.tables.map((t) =>
    t.id === params.tableId
      ? { ...t, status: "available" as const, updatedAt: new Date().toISOString() }
      : t
  );
}

