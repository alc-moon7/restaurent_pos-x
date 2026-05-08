import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getIo } from "@/lib/socket-server";
import {
  getPlatformContext,
  mapPlatformOrder,
  mapUiStatusToPlatform,
  platformFetch,
  readPlatformJson,
  readPlatformPayload,
  type PlatformOrder,
} from "@/lib/platform-api";

type PublicOrderPayload = {
  id: string;
  orderNo?: string;
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

type PublicOrderErrorPayload = {
  detail?: string;
  code?: string;
  distanceMeters?: number;
  allowedRadiusMeters?: number;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  try {
    const search = new URLSearchParams();
    if (status) search.set("status", String(mapUiStatusToPlatform(status)));
    const res = await platformFetch(`/staff/orders${search.size ? `?${search.toString()}` : ""}`, { auth: "required" }, request);
    const data = await readPlatformJson<PlatformOrder[]>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to load orders." }, { status: res.status || 502 });
    }
    return NextResponse.json(data.map(mapPlatformOrder));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud orders failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    id?: string;
    outletId?: string;
    tableNo?: string;
    customerName?: string;
    source?: string;
    items?: Array<{
      menuItemId: string;
      quantity: number;
    }>;
    note?: string;
    customerLatitude?: number;
    customerLongitude?: number;
  };
  const items = body.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  try {
    const isAdmin = requireAdmin(request);
    const context = await getPlatformContext(request);
    const outletId = body.outletId?.trim() || context?.outletId || "";
    if (!outletId) {
      return NextResponse.json({ error: "Missing outletId" }, { status: 400 });
    }
    const orderId = body.id?.trim() || crypto.randomUUID();

    const res = await platformFetch(
      `/outlets/${outletId}/orders`,
      {
        method: "POST",
        auth: "none",
        target: "customer",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": orderId,
        },
        body: JSON.stringify(
          {
            id: orderId,
            source: body.source ?? (isAdmin ? "staff_dashboard" : "cloud_customer"),
            customerName: body.customerName ?? (isAdmin ? "Walk-in Guest" : "Guest"),
            tableNo: body.tableNo ?? null,
            note: body.note ?? null,
            customerLatitude: body.customerLatitude,
            customerLongitude: body.customerLongitude,
            items: items.map((item) => ({
              menuItemId: item.menuItemId,
              qty: item.quantity,
            })),
          }
        ),
      },
      request
    );
    const payload = await readPlatformPayload<
      PlatformOrder | PublicOrderPayload | WrappedPublicOrderResponse | PublicOrderErrorPayload
    >(res);
    const order = unwrapPublicOrder(payload.data);
    if (!res.ok || !order) {
      const errorPayload = extractPublicOrderError(payload.data);
      return NextResponse.json(
        {
          error: errorPayload.detail ?? payload.detail ?? "Failed to create order.",
          code: errorPayload.code ?? null,
          distanceMeters: errorPayload.distanceMeters ?? null,
          allowedRadiusMeters: errorPayload.allowedRadiusMeters ?? null,
        },
        { status: res.status || 502 }
      );
    }
    const mapped = isPlatformOrder(order) ? mapPlatformOrder(order) : mapPublicOrder(order);
    const io = getIo();
    io?.of("/kitchen").emit("new_order", mapped);
    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud orders failed" }, { status: 502 });
  }
}

function unwrapPublicOrder(
  value: PlatformOrder | PublicOrderPayload | WrappedPublicOrderResponse | PublicOrderErrorPayload | null
) {
  if (!value || typeof value !== "object") return null;
  if ("detail" in value && typeof value.detail === "string") return null;
  if ("data" in value && value.data && typeof value.data === "object") {
    return value.data as PublicOrderPayload;
  }
  return value as PlatformOrder | PublicOrderPayload;
}

function extractPublicOrderError(
  value: PlatformOrder | PublicOrderPayload | WrappedPublicOrderResponse | PublicOrderErrorPayload | null
) {
  if (!value || typeof value !== "object") {
    return {
      detail: null,
      code: null,
      distanceMeters: null,
      allowedRadiusMeters: null,
    };
  }

  const error = "data" in value && value.data && typeof value.data === "object" ? value.data : value;
  return {
    detail: "detail" in error && typeof error.detail === "string" ? error.detail : null,
    code: "code" in error && typeof error.code === "string" ? error.code : null,
    distanceMeters:
      "distanceMeters" in error && typeof error.distanceMeters === "number" ? error.distanceMeters : null,
    allowedRadiusMeters:
      "allowedRadiusMeters" in error && typeof error.allowedRadiusMeters === "number"
        ? error.allowedRadiusMeters
        : null,
  };
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
