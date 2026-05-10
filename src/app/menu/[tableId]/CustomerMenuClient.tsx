"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { Badge, Button } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useSocket } from "@/hooks/useSocket";

type ApiMenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: number;
};

type ApiMenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  items: ApiMenuItem[];
};

type ApiTable = {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
};

type RestaurantConfig = {
  name: string | null;
  tax_rate: number;
  currency: string;
};

type PublicGeofence = {
  gpsEnforcementEnabled: boolean;
  gpsConfigured: boolean;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsRadiusMeters: number | null;
};

type ApiOrder = {
  id: string;
  table_id: string | null;
  status: "new" | "cooking" | "ready" | "completed" | "cancelled";
  total: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cooking_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  tableName: string | null;
  items: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    special_note: string | null;
    itemName: string | null;
  }>;
};

type StatusStage = "received" | "cooking" | "ready";
type LocationState = "idle" | "checking" | "ready" | "denied" | "unavailable" | "outside";

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function stageFromOrder(order: ApiOrder | null): StatusStage {
  if (!order) return "received";
  if (order.status === "ready" || order.status === "completed") return "ready";
  if (order.status === "cooking") return "cooking";
  return "received";
}

function cartMenuItemFromApi(item: ApiMenuItem) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    available: item.available === 1,
    categoryId: item.category_id,
  };
}

function isSameTableRef(candidate: ApiTable, tableRef: string) {
  const normalizedRef = tableRef.trim().toLowerCase();
  return (
    String(candidate.id).trim().toLowerCase() === normalizedRef ||
    String(candidate.name).trim().toLowerCase() === normalizedRef
  );
}

function createClientOrderId() {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  return `order_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function formatDistanceMeters(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "the restaurant";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
}

export default function CustomerMenuClient({
  restaurantId,
  outletId,
  tableId,
}: {
  restaurantId: string | null;
  outletId: string | null;
  tableId: string | null;
}) {
  const toast = useToast();
  const cartItems = useCartStore((state) => state.items);
  const setCartTableId = useCartStore((state) => state.setTableId);
  const addCartItem = useCartStore((state) => state.addItem);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const updateCartQuantity = useCartStore((state) => state.updateQuantity);
  const updateCartNote = useCartStore((state) => state.updateNote);
  const clearCart = useCartStore((state) => state.clearCart);

  const [loading, setLoading] = React.useState(true);
  const [table, setTable] = React.useState<ApiTable | null>(null);
  const [menu, setMenu] = React.useState<ApiMenuCategory[]>([]);
  const [config, setConfig] = React.useState<RestaurantConfig>({
    name: "Restaurant",
    tax_rate: 10,
    currency: "USD",
  });
  const [geofence, setGeofence] = React.useState<PublicGeofence>({
    gpsEnforcementEnabled: false,
    gpsConfigured: false,
    gpsLatitude: null,
    gpsLongitude: null,
    gpsRadiusMeters: null,
  });
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [locationState, setLocationState] = React.useState<LocationState>("idle");
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [customerLocation, setCustomerLocation] = React.useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<"all" | string>("all");
  const [cartOpen, setCartOpen] = React.useState(false);
  const [expandedNotes, setExpandedNotes] = React.useState<Record<string, boolean>>({});
  const [orderNotes, setOrderNotes] = React.useState("");
  const [placingOrder, setPlacingOrder] = React.useState(false);
  const [placeOrderError, setPlaceOrderError] = React.useState<string | null>(null);
  const [lastOrderPayload, setLastOrderPayload] = React.useState<{
    id?: string;
    outletId?: string;
    tableNo?: string;
    items: Array<{ menuItemId: string; quantity: number }>;
    note?: string;
    customerLatitude?: number;
    customerLongitude?: number;
  } | null>(null);
  const [placedOrder, setPlacedOrder] = React.useState<ApiOrder | null>(null);
  const [showTracking, setShowTracking] = React.useState(false);
  const [readyBanner, setReadyBanner] = React.useState<string | null>(null);
  const [waiterCalling, setWaiterCalling] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const publicCloudMode = Boolean(restaurantId && outletId);
  const socket = useSocket("/customer", tableId ? { tableId: String(tableId) } : undefined, {
    enabled: !publicCloudMode,
  });
  const geofenceEnforced = publicCloudMode && geofence.gpsEnforcementEnabled && geofence.gpsConfigured;

  const loadPageData = React.useCallback(async () => {
    if (!tableId) {
      setLoadError("Table not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      if (restaurantId && outletId) {
        const bootstrapRes = await fetch(
          `/api/public/bootstrap?restaurantId=${encodeURIComponent(restaurantId)}&outletId=${encodeURIComponent(outletId)}&table=${encodeURIComponent(tableId)}`,
          { cache: "no-store" }
        );
        const bootstrapData = (await bootstrapRes.json()) as {
          table?: ApiTable | null;
          menu?: ApiMenuCategory[];
          outlet?: { name?: string; tax_rate?: number; currency?: string };
          geofence?: PublicGeofence;
          error?: string;
        };
        if (!bootstrapRes.ok) {
          throw new Error(bootstrapData.error ?? "Failed to load public outlet.");
        }

        const publicTable =
          bootstrapData.table ??
          ({
            id: tableId,
            name: tableId,
            capacity: 0,
            status: "available",
          } satisfies ApiTable);

        if (!publicTable) {
          setTable(null);
          setLoadError("Table not found.");
          setMenu([]);
        } else {
          setTable(publicTable);
          setMenu(bootstrapData.menu ?? []);
          setConfig({
            name: bootstrapData.outlet?.name ?? "Restaurant",
            tax_rate: bootstrapData.outlet?.tax_rate ?? 10,
            currency: bootstrapData.outlet?.currency ?? "USD",
          });
          setGeofence(
            bootstrapData.geofence ?? {
              gpsEnforcementEnabled: false,
              gpsConfigured: false,
              gpsLatitude: null,
              gpsLongitude: null,
              gpsRadiusMeters: null,
            }
          );
        }
      } else {
        const [tablesRes, menuRes, configRes] = await Promise.all([
          fetch("/api/tables", { cache: "no-store" }),
          fetch("/api/menu", { cache: "no-store" }),
          fetch("/api/config", { cache: "no-store" }),
        ]);

        const tablesData = (await tablesRes.json()) as ApiTable[] | { error?: string };
        const menuData = (await menuRes.json()) as ApiMenuCategory[] | { error?: string };
        const configData = (await configRes.json()) as RestaurantConfig | { error?: string } | null;

        if (!tablesRes.ok) {
          throw new Error("error" in tablesData ? tablesData.error ?? "Failed to load tables." : "Failed to load tables.");
        }
        if (!menuRes.ok) {
          throw new Error("error" in menuData ? menuData.error ?? "Failed to load menu." : "Failed to load menu.");
        }
        if (!configRes.ok) {
          throw new Error(
            configData && typeof configData === "object" && "error" in configData
              ? configData.error ?? "Failed to load restaurant config."
              : "Failed to load restaurant config."
          );
        }

        const matchedTable =
          (tablesData as ApiTable[]).find((entry) => isSameTableRef(entry, tableId)) ?? null;
        if (!matchedTable) {
          setTable(null);
          setLoadError("Table not found.");
          setMenu([]);
        } else {
          setTable(matchedTable);
          setMenu(menuData as ApiMenuCategory[]);
          if (configData && !("error" in (configData as object))) {
            setConfig({
              name: (configData as RestaurantConfig).name ?? "Restaurant",
              tax_rate: (configData as RestaurantConfig).tax_rate ?? 10,
              currency: (configData as RestaurantConfig).currency ?? "USD",
            });
          }
          setGeofence({
            gpsEnforcementEnabled: false,
            gpsConfigured: false,
            gpsLatitude: null,
            gpsLongitude: null,
            gpsRadiusMeters: null,
          });
        }
      }
    } catch (e) {
      const message = (e as Error).message;
      setLoadError(message);
      toast.pushToast({
        variant: "error",
        title: "Load failed",
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [outletId, restaurantId, tableId, toast]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPageData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPageData]);

  React.useEffect(() => {
    if (!tableId) return;
    setCartTableId(tableId);
  }, [setCartTableId, tableId]);

  const evaluateCustomerCoordinates = React.useCallback(
    (latitude: number, longitude: number) => {
      if (!geofenceEnforced) {
        return { allowed: true, message: null };
      }

      if (
        geofence.gpsLatitude == null ||
        geofence.gpsLongitude == null ||
        geofence.gpsRadiusMeters == null ||
        geofence.gpsRadiusMeters <= 0
      ) {
        return {
          allowed: false,
          message: "This restaurant requires a valid GPS geofence before customers can order.",
        };
      }

      const distanceMeters = haversineMeters(
        geofence.gpsLatitude,
        geofence.gpsLongitude,
        latitude,
        longitude
      );
      if (distanceMeters > geofence.gpsRadiusMeters) {
        return {
          allowed: false,
          message: `Ordering is only available inside the restaurant range (${formatDistanceMeters(
            geofence.gpsRadiusMeters
          )}).`,
        };
      }

      return { allowed: true, message: null };
    },
    [geofence, geofenceEnforced]
  );

  const requestCustomerLocation = React.useCallback(async () => {
    if (!geofenceEnforced) {
      setLocationState("idle");
      setLocationError(null);
      return null;
    }

    if (!navigator.geolocation) {
      setLocationState("unavailable");
      setLocationError("Location services are unavailable on this device. Please enable GPS to continue.");
      return null;
    }

    setLocationState("checking");
    setLocationError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      };
      setCustomerLocation(nextLocation);
      const evaluation = evaluateCustomerCoordinates(nextLocation.latitude, nextLocation.longitude);
      if (!evaluation.allowed) {
        setLocationState("outside");
        setLocationError(evaluation.message);
        return null;
      }
      setLocationState("ready");
      return nextLocation;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? Number(error.code) : null;
      const message =
        code === 1
          ? "Location access is required to order from this restaurant."
          : "We could not get your GPS location. Please turn on location and try again.";
      setLocationState(code === 1 ? "denied" : "unavailable");
      setLocationError(message);
      return null;
    }
  }, [evaluateCustomerCoordinates, geofenceEnforced]);

  React.useEffect(() => {
    if (!geofenceEnforced) {
      const timer = window.setTimeout(() => {
        setLocationState("idle");
        setLocationError(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      void requestCustomerLocation();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [geofenceEnforced, requestCustomerLocation]);

  React.useEffect(() => {
    if (!socket || !tableId) return;

    socket.emit("join_table", { tableId: String(tableId) });
    const handleReady = (payload: { orderId: string }) => {
      setReadyBanner("Your order is ready! Please collect at the counter.");
      setShowTracking(true);
      if (placedOrder && placedOrder.id === payload.orderId) {
        setPlacedOrder((current) =>
          current
            ? {
                ...current,
                status: "ready",
                ready_at: current.ready_at ?? new Date().toISOString(),
              }
            : current
        );
      }
      window.setTimeout(() => setReadyBanner(null), 7000);
    };

    socket.on("order_ready", handleReady);
    return () => {
      socket.off("order_ready", handleReady);
    };
  }, [placedOrder, socket, tableId]);

  React.useEffect(() => {
    if (!socket) return;
    const handleMenuUpdated = (freshMenu: ApiMenuCategory[]) => {
      setMenu(freshMenu);
    };
    socket.on("menu_updated", handleMenuUpdated);
    return () => {
      socket.off("menu_updated", handleMenuUpdated);
    };
  }, [socket]);

  React.useEffect(() => {
    if (!placedOrder || !showTracking) return;

    const interval = window.setInterval(async () => {
      try {
        const orderUrl =
          outletId
            ? `/api/orders/${placedOrder.id}?outletId=${encodeURIComponent(outletId)}`
            : `/api/orders/${placedOrder.id}`;
        const res = await fetch(orderUrl, { cache: "no-store" });
        const data = (await res.json()) as ApiOrder | { error?: string };
        if (!res.ok) return;
        setPlacedOrder(data as ApiOrder);
      } catch {
        // fallback polling should fail quietly
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [outletId, placedOrder, showTracking]);

  const categories = React.useMemo(
    () =>
      menu
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((category) => ({
          ...category,
          items: (category.items ?? []).filter((item) => item.available === 1),
        }))
        .filter((category) => category.items.length > 0),
    [menu]
  );

  const visibleItems = React.useMemo(() => {
    const items = categories.flatMap((category) =>
      category.items.map((item) => ({ ...item, categoryName: category.name }))
    );
    const scoped =
      activeCategory === "all"
        ? items
        : items.filter((item) => item.category_id === activeCategory);
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scoped;
    return scoped.filter((item) => {
      return [item.name, item.description ?? "", item.categoryName]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [activeCategory, categories, searchQuery]);

  const itemCount = React.useMemo(
    () => cartItems.reduce((acc, line) => acc + line.quantity, 0),
    [cartItems]
  );
  const subtotal = React.useMemo(
    () => cartItems.reduce((acc, line) => acc + line.menuItem.price * line.quantity, 0),
    [cartItems]
  );
  const tax = (subtotal * config.tax_rate) / 100;
  const total = subtotal + tax;
  const statusStage = stageFromOrder(placedOrder);
  const unavailableCartItemIds = React.useMemo(() => {
    const availability = new Map<string, number>();
    for (const category of menu) {
      for (const item of category.items ?? []) {
        availability.set(item.id, item.available);
      }
    }
    return cartItems
      .map((line) => line.menuItem.id)
      .filter((id) => (availability.get(id) ?? 0) !== 1);
  }, [cartItems, menu]);

  async function submitOrder(payload?: {
    id?: string;
    outletId?: string;
    tableNo?: string;
    items: Array<{ menuItemId: string; quantity: number }>;
    note?: string;
    customerLatitude?: number;
    customerLongitude?: number;
  }) {
    if (unavailableCartItemIds.length > 0) {
      toast.pushToast({
        variant: "error",
        title: "Items unavailable",
        message: "Some items in your cart are no longer available. Please remove them to continue.",
      });
      return;
    }

    const nextPayload =
      payload ??
      (tableId && cartItems.length > 0
        ? {
            id: createClientOrderId(),
            outletId: outletId ?? undefined,
            tableNo: tableId,
            items: cartItems.map((line) => ({
              menuItemId: line.menuItem.id,
              quantity: line.quantity,
            })),
            note: orderNotes.trim() || undefined,
          }
        : null);

    if (!nextPayload) return;

    const liveLocation = geofenceEnforced ? await requestCustomerLocation() : customerLocation;
    if (geofenceEnforced && !liveLocation) {
      return;
    }

    const requestPayload = {
      ...nextPayload,
      customerLatitude: liveLocation?.latitude,
      customerLongitude: liveLocation?.longitude,
    };

    setPlacingOrder(true);
    setPlaceOrderError(null);
    setLastOrderPayload(requestPayload);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const data = (await res.json()) as
        | ApiOrder
        | {
            error?: string;
            code?: string | null;
            allowedRadiusMeters?: number | null;
          };
      if (!res.ok) {
        if ("code" in data && data.code === "LOCATION_REQUIRED") {
          setLocationState("denied");
          setLocationError(data.error ?? "Location access is required to order from this restaurant.");
        }
        if ("code" in data && data.code === "OUTSIDE_GEOFENCE") {
          setLocationState("outside");
          setLocationError(
            data.error ??
              `Ordering is only available inside the restaurant range (${formatDistanceMeters(
                data.allowedRadiusMeters ?? geofence.gpsRadiusMeters
              )}).`
          );
        }
        throw new Error("error" in data ? data.error ?? "Failed to place order." : "Failed to place order.");
      }

      const created = data as ApiOrder;
      setPlacedOrder(created);
      setShowTracking(false);
      clearCart();
      setOrderNotes("");
      setCartOpen(false);
    } catch (e) {
      const message = (e as Error).message;
      setPlaceOrderError(message);
      toast.pushToast({
        variant: "error",
        title: "Order failed",
        message,
      });
    } finally {
      setPlacingOrder(false);
    }
  }

  async function callWaiter() {
    if (!tableId || !table) return;
    setWaiterCalling(true);
    try {
      if (publicCloudMode) {
        throw new Error("Waiter call is not available in the cloud customer API yet.");
      }

      const res = await fetch("/api/waiter-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to notify staff.");
      }
      toast.pushToast({
        variant: "success",
        title: "Staff notified",
        message: "Staff has been notified!",
      });
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Waiter call failed",
        message: (e as Error).message,
      });
    } finally {
      setWaiterCalling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="rounded-[1.75rem] bg-primary p-4 shadow-[0_10px_26px_rgba(0,0,0,0.10)]">
            <Skeleton className="h-4 w-28 bg-black/10" />
            <Skeleton className="mt-3 h-7 w-44 bg-black/10" />
          </div>
          <div className="mt-4 flex gap-2 overflow-hidden pb-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-20 rounded-full" />
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-black/10 bg-white p-3 shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
                <div className="flex gap-3">
                  <Skeleton className="h-[88px] w-[88px] rounded-2xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-4 h-8 w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !table) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <EmptyState
            title={loadError === "Table not found." ? "Table not found" : "Unable to load menu"}
            description={loadError ?? "Please try again."}
            cta={{ label: "Retry", variant: "primary" }}
            onCta={() => void loadPageData()}
          />
        </div>
      </div>
    );
  }

  if (geofenceEnforced && (locationState === "idle" || locationState === "checking")) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <EmptyState
            title="Checking your location"
            description="Please keep GPS turned on while we confirm that you are inside the restaurant."
          />
        </div>
      </div>
    );
  }

  if (geofenceEnforced && (locationState === "denied" || locationState === "unavailable" || locationState === "outside")) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <EmptyState
            title={locationState === "outside" ? "Outside restaurant range" : "Location required"}
            description={
              locationError ??
              "This restaurant requires your live GPS location before you can open the QR menu."
            }
            cta={{ label: "Retry Location", variant: "primary" }}
            onCta={() => void requestCustomerLocation()}
          />
        </div>
      </div>
    );
  }

  if (placedOrder && !showTracking) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
          <div className="rounded-[1.75rem] border border-black/10 bg-white p-5 text-center shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black">
              ✓
            </div>
            <div className="mt-4 text-2xl font-black tracking-tight">Order placed</div>
            <div className="mt-2 text-xs font-bold text-secondary">
              Order #{placedOrder.id}
            </div>
            <div className="mt-2 text-sm font-medium text-secondary">
              We received your order. You can track it from here.
            </div>

            <div className="mt-5 rounded-3xl border border-black/10 bg-neutral p-4 text-left">
              <div className="text-sm font-black tracking-tight text-foreground">Items</div>
              <div className="mt-3 space-y-2">
                {placedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-secondary">
                      {item.quantity}x {item.itemName ?? "Item"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(item.unit_price * item.quantity, config.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="primary" className="flex-1" onClick={() => setShowTracking(true)}>
                Track Status
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (placedOrder && showTracking) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-md px-4 py-6">
          <div className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black tracking-tight">Order status</div>
                <div className="mt-1 text-xs font-bold text-secondary">
                  Order #{placedOrder.id} • {table.name}
                </div>
              </div>
              <Badge variant={statusStage === "ready" ? "success" : statusStage === "cooking" ? "info" : "warning"}>
                {statusStage === "ready" ? "Ready!" : statusStage === "cooking" ? "Cooking..." : "Received"}
              </Badge>
            </div>

            {readyBanner ? (
              <div className="mt-4 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-black text-foreground">
                {readyBanner}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { key: "received", label: "Received" },
                { key: "cooking", label: "Cooking..." },
                { key: "ready", label: "Ready!" },
              ].map((step) => {
                const reached =
                  (step.key === "received" && true) ||
                  (step.key === "cooking" && (statusStage === "cooking" || statusStage === "ready")) ||
                  (step.key === "ready" && statusStage === "ready");
                return (
                  <div
                    key={step.key}
                    className={[
                      "rounded-2xl border px-2 py-3 text-center",
                      reached
                        ? "border-black/10 bg-primary text-foreground"
                        : "border-black/10 bg-white text-secondary",
                    ].join(" ")}
                  >
                    <div className="text-lg font-black">{reached ? "✓" : "…"}</div>
                    <div className="mt-1 text-xs font-black">{step.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowTracking(false)}>
                Back
              </Button>
              {!publicCloudMode ? (
                <Button variant="secondary" className="flex-1" onClick={() => void callWaiter()}>
                  {waiterCalling ? "Calling..." : "Call Waiter"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white">
        <div className="mx-auto max-w-md px-3 py-3">
          <div className="rounded-[1.6rem] bg-primary p-4 shadow-[0_8px_22px_rgba(0,0,0,0.10)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">
                  {publicCloudMode ? "Online menu" : "Table menu"}
                </div>
                <div className="mt-1 truncate text-xl font-black tracking-tight text-foreground">
                  {config.name ?? "Restaurant"}
                </div>
                <div className="mt-1 text-xs font-bold text-foreground/70">
                  Table {table.name} • {categories.length} categories
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-black text-foreground shadow-[0_6px_14px_rgba(0,0,0,0.08)]"
              >
                Cart {itemCount}
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-full border border-black/10 bg-white px-3 py-2 shadow-[0_6px_16px_rgba(0,0,0,0.05)]">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search food"
              className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-secondary/70"
            />
          </div>

          <div className="mt-3 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-2 text-xs font-black transition-colors",
                  activeCategory === "all"
                    ? "border-black/10 bg-primary text-foreground"
                    : "border-black/10 bg-white text-foreground"
                )}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-2 text-xs font-black transition-colors",
                    activeCategory === category.id
                      ? "border-black/10 bg-primary text-foreground"
                      : "border-black/10 bg-white text-foreground"
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {readyBanner ? (
        <div className="mx-auto max-w-md px-3 pt-3">
          <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-black text-foreground">
            {readyBanner}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-md px-3 pb-28 pt-3">
        {visibleItems.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white p-5 text-center shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
            <div className="text-base font-black">No items found</div>
            <div className="mt-1 text-sm font-medium text-secondary">
              Try another category or search term.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => {
            const line = cartItems.find((entry) => entry.menuItem.id === item.id) ?? null;
            const quantity = line?.quantity ?? 0;
            return (
              <div
                key={item.id}
                className="rounded-3xl border border-black/10 bg-white p-3 shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
              >
                <div className="flex gap-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-[92px] w-[92px] shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl bg-primary px-2 text-center text-[10px] font-black uppercase tracking-wide text-foreground">
                      {item.categoryName}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="line-clamp-1 text-base font-black tracking-tight text-foreground">
                        {item.name}
                      </div>
                      <div className="shrink-0 text-sm font-black text-foreground">
                        {formatMoney(item.price, config.currency)}
                      </div>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-secondary">
                        {item.description || "No description available."}
                    </div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.08em] text-secondary/80">
                      {item.categoryName}
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      {quantity === 0 ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => addCartItem(cartMenuItemFromApi(item))}
                        >
                          Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-black/10 bg-neutral p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, quantity - 1)}
                            className="h-8 w-8 rounded-full bg-white text-lg font-black text-foreground"
                          >
                            -
                          </button>
                          <div className="min-w-7 text-center text-sm font-black text-foreground">
                            {quantity}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, quantity + 1)}
                            className="h-8 w-8 rounded-full bg-primary text-lg font-black text-foreground"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </main>

      {itemCount > 0 ? (
        <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md">
          <div className="flex h-[56px] items-center gap-2 rounded-full border border-black/10 bg-white p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex h-full min-w-0 flex-1 items-center justify-between rounded-full px-3 text-foreground"
            >
              <span className="text-xs font-black">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <span className="truncate pl-2 text-xs font-black">
                {formatMoney(total, config.currency)}
              </span>
            </button>
            <button
              type="button"
              disabled={placingOrder || cartItems.length === 0 || unavailableCartItemIds.length > 0}
              onClick={() => void submitOrder()}
              className="flex h-full min-w-[132px] items-center justify-center rounded-full bg-primary px-4 text-sm font-black text-foreground disabled:opacity-60"
            >
              {placingOrder ? "Placing..." : "Place Order"}
            </button>
          </div>
        </div>
      ) : null}

      {!publicCloudMode ? (
        <div className={cn("fixed left-3 z-50", itemCount > 0 ? "bottom-20" : "bottom-3")}>
          <Button variant="secondary" size="sm" disabled={waiterCalling} onClick={() => void callWaiter()}>
            {waiterCalling ? "Calling..." : "Call Waiter"}
          </Button>
        </div>
      ) : null}

      <div className={["fixed inset-0 z-50", cartOpen ? "" : "pointer-events-none"].join(" ")}>
        <div
          className={[
            "absolute inset-0 bg-secondary/60 backdrop-blur-sm transition-opacity",
            cartOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onMouseDown={() => setCartOpen(false)}
        />

        <div
          className={[
            "absolute bottom-0 left-0 right-0 max-h-[88vh] rounded-t-[28px] bg-white shadow-[0_-18px_50px_rgba(0,0,0,0.16)] transition-transform",
            cartOpen ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
        >
          <div className="mx-auto max-w-md px-4 pb-6 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black tracking-tight text-foreground">Your cart</div>
                <div className="mt-1 text-xs font-bold text-secondary">
                  Subtotal {formatMoney(subtotal, config.currency)} • Tax {formatMoney(tax, config.currency)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="h-10 w-10 rounded-full border border-black/10 bg-neutral text-lg font-black text-foreground"
              >
                ×
              </button>
            </div>

            <div className="mt-4 max-h-[45vh] space-y-3 overflow-auto pr-1">
              {cartItems.map((line) => (
                <div key={line.menuItem.id} className="rounded-3xl border border-black/10 bg-white p-3 shadow-[0_6px_16px_rgba(0,0,0,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black tracking-tight text-foreground">
                        {line.menuItem.name}
                      </div>
                      <div className="mt-1 text-xs font-bold text-secondary">
                        {formatMoney(line.menuItem.price, config.currency)} each
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCartItem(line.menuItem.id)}
                      className="text-xs font-black text-foreground underline decoration-danger/40"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(line.menuItem.id, line.quantity - 1)}
                        className="h-9 w-9 rounded-full border border-black/10 bg-neutral text-lg font-black text-foreground"
                      >
                        -
                      </button>
                      <div className="flex h-9 min-w-10 items-center justify-center rounded-full border border-black/10 bg-white font-black text-foreground">
                        {line.quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(line.menuItem.id, line.quantity + 1)}
                        className="h-9 w-9 rounded-full bg-primary text-lg font-black text-foreground"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNotes((current) => ({
                          ...current,
                          [line.menuItem.id]: !current[line.menuItem.id],
                        }))
                      }
                      className="text-xs font-black text-foreground"
                    >
                      {expandedNotes[line.menuItem.id] ? "Hide notes" : "Special instructions"}
                    </button>
                  </div>

                  {expandedNotes[line.menuItem.id] ? (
                    <textarea
                      value={line.specialNote}
                      onChange={(event) => updateCartNote(line.menuItem.id, event.target.value)}
                      placeholder="Add special instructions"
                      className="mt-3 min-h-[44px] w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-black/10 bg-neutral p-4">
              <div className="text-sm font-black text-foreground">Order notes</div>
              <textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                placeholder="Optional notes for the whole order"
                className="mt-2 min-h-[58px] w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-secondary">Subtotal</span>
                  <span className="font-semibold text-foreground">
                    {formatMoney(subtotal, config.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-secondary">Tax ({config.tax_rate}%)</span>
                  <span className="font-semibold text-foreground">
                    {formatMoney(tax, config.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-base font-black tracking-tight">
                  <span>Total</span>
                  <span>{formatMoney(total, config.currency)}</span>
                </div>
              </div>

              {unavailableCartItemIds.length > 0 ? (
                <div className="mt-4 rounded-[1.25rem] border border-warning/25 bg-warning/10 px-4 py-3 text-sm font-black text-foreground">
                  Some items are no longer available. Remove them to place your order.
                </div>
              ) : null}

              {placeOrderError ? (
                <div className="mt-4 rounded-[1.25rem] border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-bold text-foreground">
                  {placeOrderError}
                </div>
              ) : null}

              <div className="mt-4 flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={placingOrder || cartItems.length === 0 || unavailableCartItemIds.length > 0}
                  onClick={() => void submitOrder()}
                >
                  {placingOrder ? "Placing..." : "Place Order"}
                </Button>
                {placeOrderError && lastOrderPayload ? (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={placingOrder}
                    onClick={() => void submitOrder(lastOrderPayload)}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
