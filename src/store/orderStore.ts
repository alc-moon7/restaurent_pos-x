import { create } from "zustand";
import type { Socket } from "socket.io-client";
import { io as createIo } from "socket.io-client";

export type ApiOrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  special_note: string | null;
  itemName: string | null;
};

export type ApiOrder = {
  id: string;
  table_id: string | null;
  status: "new" | "cooking" | "ready" | "completed" | "cancelled";
  total: number | null;
  notes: string | null;
  cooking_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  tableName: string | null;
  items: ApiOrderItem[];
};

type OrderState = {
  orders: ApiOrder[];
  activeOrder: ApiOrder | null;
  loading: boolean;
  error: string | null;

  fetchOrders: (status?: ApiOrder["status"]) => Promise<void>;
  placeOrder: (
    tableId: string,
    items: Array<{ menuItemId: string; quantity: number; unitPrice: number; specialNote?: string }>,
    notes?: string
  ) => Promise<ApiOrder>;
  updateStatus: (id: string, status: ApiOrder["status"]) => Promise<void>;

  initRealtime: () => void;
  disconnectRealtime: () => void;
};

function connectKitchenSocket(): Socket {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return createIo(`http://${hostname}:3000/kitchen`, {
    transports: ["websocket"],
    autoConnect: true,
  });
}

export const useOrderStore = create<OrderState>((set) => {
  let socket: Socket | null = null;

  function upsertOrder(incoming: ApiOrder) {
    set((state) => {
      const idx = state.orders.findIndex((o) => o.id === incoming.id);
      if (idx >= 0) {
        const copy = state.orders.slice();
        copy[idx] = incoming;
        return { orders: copy };
      }
      return { orders: [incoming, ...state.orders] };
    });
  }

  return {
    orders: [],
    activeOrder: null,
    loading: false,
    error: null,

    fetchOrders: async (status) => {
      set({ loading: true, error: null });
      try {
        const url = status ? `/api/orders?status=${encodeURIComponent(status)}` : "/api/orders";
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
        const orders = (await res.json()) as ApiOrder[];
        set({ orders, loading: false });
      } catch (e) {
        set({ loading: false, error: (e as Error).message });
      }
    },

    placeOrder: async (tableId, items, notes) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, items, notes }),
      });
      const data = (await res.json()) as ApiOrder | { error: string };
      if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);
      upsertOrder(data as ApiOrder);
      return data as ApiOrder;
    },

    updateStatus: async (id, status) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as ApiOrder | { error: string };
      if (!res.ok) throw new Error("error" in data ? data.error : `Failed (${res.status})`);
      upsertOrder(data as ApiOrder);
    },

    initRealtime: () => {
      if (typeof window === "undefined") return;
      if (socket) return;

      socket = connectKitchenSocket();

      socket.on("new_order", (order: ApiOrder) => {
        upsertOrder(order);
      });

      socket.on("order_updated", async (payload: ApiOrder | { orderId: string; status: ApiOrder["status"] }) => {
        if ("items" in payload) {
          upsertOrder(payload);
          return;
        }

        try {
          const res = await fetch(`/api/orders/${payload.orderId}`, {
            cache: "no-store",
            credentials: "include",
          });
          if (!res.ok) return;
          const updated = (await res.json()) as ApiOrder;
          upsertOrder(updated);
        } catch {
          // ignore
        }
      });
    },

    disconnectRealtime: () => {
      if (!socket) return;
      socket.disconnect();
      socket = null;
    },
  };
});
