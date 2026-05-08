import { networkInterfaces } from "node:os";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { DEFAULT_CUSTOMER_PLATFORM_API_BASE_URL } from "@/lib/public-menu-deployment";
import { PLATFORM_ACCESS_COOKIE, PLATFORM_CONTEXT_COOKIE, decodePlatformContext } from "@/lib/platform-session";

export type PlatformFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  auth?: "required" | "optional" | "none";
  cache?: RequestCache;
  target?: "backend" | "customer";
};

export function getBackendPlatformBaseUrl() {
  return (
    process.env.PLATFORM_BACKEND_API_BASE_URL ??
    process.env.OWNER_PLATFORM_API_BASE_URL ??
    process.env.ADMIN_PLATFORM_API_BASE_URL ??
    "http://127.0.0.1:8000/api/v1"
  ).replace(/\/+$/, "");
}

export function getCustomerPlatformBaseUrl() {
  return (
    process.env.PLATFORM_API_BASE_URL ??
    DEFAULT_CUSTOMER_PLATFORM_API_BASE_URL
  ).replace(/\/+$/, "");
}

export function getPlatformBaseUrl(target: PlatformFetchOptions["target"] = "backend") {
  return target === "customer" ? getCustomerPlatformBaseUrl() : getBackendPlatformBaseUrl();
}

export function getMenuBaseUrl(request?: NextRequest) {
  const configured = (
    process.env.NEXT_PUBLIC_MENU_BASE_URL ??
    process.env.MENU_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const resolved = new URL(configured);
  if (!isLoopbackHost(resolved.hostname)) {
    return resolved.toString().replace(/\/+$/, "");
  }

  const requestUrl = request ? new URL(request.url) : null;
  if (requestUrl && !isLoopbackHost(requestUrl.hostname)) {
    resolved.protocol = requestUrl.protocol;
    resolved.host = requestUrl.host;
    return resolved.toString().replace(/\/+$/, "");
  }

  const lanIp = detectLanIpv4();
  if (lanIp) {
    resolved.hostname = lanIp;
  }

  return resolved.toString().replace(/\/+$/, "");
}

export async function getPlatformAccessToken(request?: NextRequest) {
  if (request) {
    return request.cookies.get(PLATFORM_ACCESS_COOKIE)?.value ?? null;
  }
  const cookieStore = await cookies();
  return cookieStore.get(PLATFORM_ACCESS_COOKIE)?.value ?? null;
}

export async function getPlatformContext(request?: NextRequest) {
  const encoded = request
    ? request.cookies.get(PLATFORM_CONTEXT_COOKIE)?.value
    : (await cookies()).get(PLATFORM_CONTEXT_COOKIE)?.value;
  return decodePlatformContext(encoded);
}

export async function platformFetch(path: string, options: PlatformFetchOptions = {}, request?: NextRequest) {
  const auth = options.auth ?? "required";
  const headers = new Headers(options.headers);

  if (auth !== "none") {
    const token = await getPlatformAccessToken(request);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    else if (auth === "required") throw new Error("Missing platform access token.");
  }

  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  return fetch(`${getPlatformBaseUrl(options.target)}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ?? null,
    cache: options.cache ?? "no-store",
  });
}

export async function readPlatformJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function readPlatformPayload<T>(
  res: Response
): Promise<{ data: T | null; detail: string | null; rawText: string }> {
  const rawText = await res.text();
  if (!rawText) {
    return { data: null, detail: null, rawText: "" };
  }

  try {
    return {
      data: JSON.parse(rawText) as T,
      detail: null,
      rawText,
    };
  } catch {
    return {
      data: null,
      detail: rawText,
      rawText,
    };
  }
}

export type PlatformMenuItem = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
};

export type PlatformMenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: PlatformMenuItem[];
};

export type PlatformTable = {
  id: string;
  name: string;
  seats: number;
  status: "available" | "occupied" | "reserved" | "out_of_service";
};

export type PlatformOrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  nameSnapshot: string;
  unitPrice: number;
  quantity: number;
  notes: string | null;
};

export type PlatformOrder = {
  id: string;
  tableId: string | null;
  tableNo: string | null;
  orderType: "dine_in" | "pickup";
  customerName: string | null;
  status: "pending" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
  note: string | null;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  cancelledAt: string | null;
  items: PlatformOrderItem[];
};

export type PlatformConfig = {
  restaurantId: string;
  restaurantName: string;
  restaurantStatus: string;
  outletId: string;
  outletName: string;
  currency: string;
  taxRate: number;
  prepTimeMinutes: number;
  tableOrderingEnabled: boolean;
  customerOrderingEnabled: boolean;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsRadiusMeters: number | null;
  gpsEnforcementEnabled: boolean;
  printer: {
    deviceId: string | null;
    connectionType: string;
    address: string | null;
    paperWidth: number;
    autoPrintKitchen: boolean;
  };
  subscription: {
    status: string;
    planName: string;
  };
  sync: {
    status: string;
    lastSyncedAt: string | null;
  };
};

function toUiOrderStatus(status: PlatformOrder["status"]) {
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

function toPlatformOrderStatus(status: string) {
  switch (status) {
    case "cooking":
      return "preparing";
    case "ready":
      return "ready";
    case "completed":
      return "served";
    case "cancelled":
      return "cancelled";
    case "new":
      return "accepted";
    default:
      return status;
  }
}

export function mapPlatformMenu(categories: PlatformMenuCategory[]) {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    sort_order: category.sortOrder,
    items: category.items.map((item) => ({
      id: item.id,
      category_id: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.imageUrl,
      available: item.isAvailable ? 1 : 0,
    })),
  }));
}

export function mapPlatformTables(tables: PlatformTable[]) {
  return tables.map((table) => ({
    id: table.id,
    name: table.name,
    capacity: table.seats,
    status: table.status === "out_of_service" ? "reserved" : table.status,
  }));
}

export function mapPlatformOrder(order: PlatformOrder) {
  return {
    id: order.id,
    table_id: order.tableId,
    status: toUiOrderStatus(order.status),
    total: order.total,
    notes: order.note,
    cooking_at: order.preparingAt,
    ready_at: order.readyAt,
    completed_at: order.servedAt,
    cancelled_at: order.cancelledAt,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    tableName: order.tableNo,
    items: order.items.map((item) => ({
      id: item.id,
      order_id: item.orderId,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      special_note: item.notes,
      itemName: item.nameSnapshot,
    })),
  };
}

export function mapPlatformConfig(config: PlatformConfig) {
  return {
    name: config.restaurantName,
    address: `${config.outletName} / ${config.restaurantStatus}`,
    phone: null,
    tax_rate: config.taxRate,
    currency: config.currency,
    logo: null,
    restaurantId: config.restaurantId,
    restaurantStatus: config.restaurantStatus,
    outletId: config.outletId,
    outletName: config.outletName,
    subscriptionStatus: config.subscription.status,
    planName: config.subscription.planName,
    syncStatus: config.sync.status,
    lastSyncedAt: config.sync.lastSyncedAt,
    prepTimeMinutes: config.prepTimeMinutes,
    tableOrderingEnabled: config.tableOrderingEnabled,
    customerOrderingEnabled: config.customerOrderingEnabled,
    gpsLatitude: config.gpsLatitude,
    gpsLongitude: config.gpsLongitude,
    gpsRadiusMeters: config.gpsRadiusMeters,
    gpsEnforcementEnabled: config.gpsEnforcementEnabled,
    printer: {
      connection_type: config.printer.connectionType,
      address: config.printer.address,
      paper_width: config.printer.paperWidth,
      device_id: config.printer.deviceId,
      auto_print_kitchen: config.printer.autoPrintKitchen,
    },
  };
}

export function buildPlatformOrderPayload(body: {
  tableId?: string | null;
  tableNo?: string | null;
  customerName?: string | null;
  note?: string | null;
  source?: string;
  orderType?: "dine_in" | "pickup";
  items?: Array<{
    menuItemId: string;
    quantity?: number;
    qty?: number;
    specialNote?: string;
  }>;
}) {
  return {
    tableId: body.tableId ?? null,
    tableNo: body.tableNo ?? null,
    customerName: body.customerName ?? null,
    note: body.note ?? null,
    source: body.source ?? "cloud_customer",
    orderType: body.orderType ?? "dine_in",
    items:
      body.items?.map((item) => ({
        menuItemId: item.menuItemId,
        qty: item.qty ?? item.quantity ?? 1,
      })) ?? [],
  };
}

export function mapUiStatusToPlatform(status: string) {
  return toPlatformOrderStatus(status);
}

function isLoopbackHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "0.0.0.0";
}

function detectLanIpv4() {
  const interfaces = networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (entry.address.startsWith("169.254.")) continue;
      return entry.address;
    }
  }
  return null;
}
