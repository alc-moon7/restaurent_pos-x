import { NextRequest, NextResponse } from "next/server";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";

type PublicMenuItem = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  preparationTimeMinutes?: number | null;
  tags?: string[];
};

type WrappedPublicMenuResponse = {
  ok?: boolean;
  count?: number;
  data?: PublicMenuItem[];
  detail?: string;
};

type PublicBootstrapResponse = {
  ok?: boolean;
  detail?: string;
  data?: {
    restaurant?: {
      id?: string;
      name?: string;
    };
    outlet?: {
      id?: string;
      name?: string;
      currency?: string;
      taxRate?: number;
      prepTimeMinutes?: number | null;
    };
    geofence?: {
      gpsEnforcementEnabled?: boolean;
      gpsConfigured?: boolean;
      gpsLatitude?: number | null;
      gpsLongitude?: number | null;
      gpsRadiusMeters?: number | null;
    };
  };
};

type PublicBootstrapData = NonNullable<PublicBootstrapResponse["data"]>;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId")?.trim();
  const outletId = searchParams.get("outletId")?.trim();
  const table = searchParams.get("table")?.trim();

  if (!restaurantId || !outletId) {
    return NextResponse.json({ error: "restaurantId and outletId are required." }, { status: 400 });
  }

  try {
    const menuRes = await platformFetch(`/outlets/${outletId}/menu`, { auth: "none", target: "customer" }, request);
    const menuPayload = await readPlatformJson<PublicMenuItem[] | WrappedPublicMenuResponse>(menuRes);
    const data = Array.isArray(menuPayload) ? menuPayload : menuPayload.data ?? null;
    if (!menuRes.ok || !Array.isArray(data)) {
      return NextResponse.json({ error: "Failed to load public menu." }, { status: menuRes.status || 502 });
    }

    const bootstrapData = await loadOutletBootstrap(outletId, request);
    const categories = new Map<
      string,
      {
        id: string;
        name: string;
        sort_order: number;
        items: Array<{
          id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          image: string | null;
          available: number;
        }>;
      }
    >();

    for (const item of data) {
      const categoryName = item.category?.trim() || "Menu";
      const categoryKey = categoryName.toLowerCase();
      const existing =
        categories.get(categoryKey) ??
        {
          id: categoryKey.replace(/[^a-z0-9]+/g, "-") || "menu",
          name: categoryName,
          sort_order: categories.size,
          items: [],
        };

      existing.items.push({
        id: item.id,
        category_id: existing.id,
        name: item.name,
        description: item.description ?? null,
        price: item.price,
        image: item.imageUrl ?? null,
        available: item.isAvailable ? 1 : 0,
      });
      categories.set(categoryKey, existing);
    }

    return NextResponse.json(
      {
        restaurant: {
          id: bootstrapData.restaurant?.id ?? restaurantId,
          name: bootstrapData.restaurant?.name ?? "Restaurant",
        },
        outlet: {
          id: bootstrapData.outlet?.id ?? outletId,
          name: bootstrapData.outlet?.name ?? "Restaurant",
          currency: bootstrapData.outlet?.currency ?? "BDT",
          tax_rate: bootstrapData.outlet?.taxRate ?? 0,
          prep_time_minutes: bootstrapData.outlet?.prepTimeMinutes ?? null,
        },
        table: table
          ? {
              id: table,
              name: table,
              capacity: 0,
              status: "available",
            }
          : null,
        geofence: {
          gpsEnforcementEnabled: bootstrapData.geofence?.gpsEnforcementEnabled ?? false,
          gpsConfigured: bootstrapData.geofence?.gpsConfigured ?? false,
          gpsLatitude: bootstrapData.geofence?.gpsLatitude ?? null,
          gpsLongitude: bootstrapData.geofence?.gpsLongitude ?? null,
          gpsRadiusMeters: bootstrapData.geofence?.gpsRadiusMeters ?? null,
        },
        menu: Array.from(categories.values()),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Public bootstrap failed" },
      { status: 502 }
    );
  }
}

async function loadOutletBootstrap(outletId: string, request: NextRequest): Promise<Partial<PublicBootstrapData>> {
  try {
    const bootstrapRes = await platformFetch(`/outlets/${outletId}/bootstrap`, { auth: "none", target: "customer" }, request);
    if (!bootstrapRes.ok) return {};
    const bootstrapPayload = await readPlatformJson<PublicBootstrapResponse>(bootstrapRes);
    return bootstrapPayload.data ?? {};
  } catch {
    return {};
  }
}
