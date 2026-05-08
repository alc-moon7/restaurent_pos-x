import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getIo } from "@/lib/socket-server";
import { getPlatformContext, mapPlatformOrder, mapUiStatusToPlatform, platformFetch, readPlatformJson, type PlatformOrder } from "@/lib/platform-api";

type PublicOrderPayload = {
  id: string;
  source?: string;
  customerName?: string | null;
  tableNo?: string | null;
  note?: string | null;
  status: "pending" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
  total: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    orderId?: string;
    menuItemId: string;
    name?: string | null;
    qty: number;
    price: number;
  }>;
};

type WrappedPublicOrderResponse = {
  ok?: boolean;
  data?: PublicOrderPayload;
  detail?: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const url = new URL(request.url);
    const session = await getPlatformContext(request);
    const outletId = url.searchParams.get("outletId")?.trim() || session?.outletId || "";
    if (!outletId) {
      return NextResponse.json({ error: "Missing outletId" }, { status: 400 });
    }
    const res = await platformFetch(`/outlets/${outletId}/orders/${id}`, { auth: "none", target: "customer" }, request);
    const data = await readPlatformJson<PlatformOrder | PublicOrderPayload | WrappedPublicOrderResponse | { detail?: string }>(res);
    const order = unwrapPublicOrder(data);
    if (!res.ok || !order) {
      return NextResponse.json({ error: "Not found" }, { status: res.status || 404 });
    }
    return NextResponse.json(isPlatformOrder(order) ? mapPlatformOrder(order) : mapPublicOrder(order));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud order failed" }, { status: 502 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: string };
  if (!body.status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  try {
    const res = await platformFetch(
      `/staff/orders/${id}`,
      {
        method: "PATCH",
        auth: "required",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: mapUiStatusToPlatform(body.status) }),
      },
      request
    );
    const data = await readPlatformJson<PlatformOrder | { detail?: string }>(res);
    if (!res.ok || "detail" in data) {
      return NextResponse.json({ error: "Failed to update order." }, { status: res.status || 502 });
    }
    const mapped = mapPlatformOrder(data as PlatformOrder);
    const io = getIo();
    io?.of("/kitchen").emit("order_updated", mapped);
    if (mapped.table_id) {
      io?.of("/customer").to(mapped.table_id).emit("order_updated", mapped);
      if (mapped.status === "ready") {
        io?.of("/customer").to(mapped.table_id).emit("order_ready", { orderId: mapped.id });
      }
    }
    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud order failed" }, { status: 502 });
  }
}

function unwrapPublicOrder(
  value: PlatformOrder | PublicOrderPayload | WrappedPublicOrderResponse | { detail?: string }
) {
  if (!value || typeof value !== "object") return null;
  if ("detail" in value && typeof value.detail === "string") return null;
  if ("data" in value && value.data && typeof value.data === "object") {
    return value.data as PublicOrderPayload;
  }
  return value as PlatformOrder | PublicOrderPayload;
}

function isPlatformOrder(value: PlatformOrder | PublicOrderPayload): value is PlatformOrder {
  return "orderType" in value;
}

function mapPublicOrder(order: PublicOrderPayload) {
  const status = toUiOrderStatus(order.status);
  const statusTime = order.updatedAt ?? order.createdAt;
  return {
    id: order.id,
    table_id: order.tableNo ?? null,
    status,
    total: order.total,
    notes: order.note ?? null,
    cooking_at: status === "cooking" ? statusTime : null,
    ready_at: status === "ready" ? statusTime : null,
    completed_at: status === "completed" ? statusTime : null,
    cancelled_at: status === "cancelled" ? statusTime : null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    tableName: order.tableNo ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      order_id: item.orderId ?? order.id,
      menu_item_id: item.menuItemId,
      quantity: item.qty,
      unit_price: item.price,
      special_note: null,
      itemName: item.name ?? null,
    })),
  };
}

function toUiOrderStatus(status: PublicOrderPayload["status"]) {
  switch (status) {
    case "preparing":
      return "cooking";
    case "ready":
      return "ready";
    case "served":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "new";
  }
}
