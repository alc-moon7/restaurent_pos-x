import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mapPlatformConfig, platformFetch, readPlatformJson, type PlatformConfig } from "@/lib/platform-api";

export async function GET() {
  try {
    const res = await platformFetch("/staff/config", { auth: "required" });
    const data = await readPlatformJson<PlatformConfig | { detail?: string }>(res);
    if (!res.ok || "detail" in data) {
      return NextResponse.json({ error: "Failed to load cloud config." }, { status: res.status || 502 });
    }
    return NextResponse.json(mapPlatformConfig(data as PlatformConfig));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud config failed" }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    name: string | null;
    address: string | null;
    phone: string | null;
    tax_rate: number;
    currency: string;
    logo: string | null;
    prep_time_minutes: number;
    table_ordering_enabled: boolean;
    customer_ordering_enabled: boolean;
    gps_latitude: number | null;
    gps_longitude: number | null;
    gps_radius_meters: number | null;
    gps_enforcement_enabled: boolean;
  }>;

  try {
    const res = await platformFetch(
      "/staff/config",
      {
        method: "PATCH",
        auth: "required",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: body.name,
          address: body.address,
          phone: body.phone,
          currency: body.currency,
          taxRate: body.tax_rate,
          prepTimeMinutes: body.prep_time_minutes,
          tableOrderingEnabled: body.table_ordering_enabled,
          customerOrderingEnabled: body.customer_ordering_enabled,
          gpsLatitude: body.gps_latitude,
          gpsLongitude: body.gps_longitude,
          gpsRadiusMeters: body.gps_radius_meters,
          gpsEnforcementEnabled: body.gps_enforcement_enabled,
        }),
      },
      request
    );
    const data = await readPlatformJson<PlatformConfig | { detail?: string }>(res);
    if (!res.ok || "detail" in data) {
      return NextResponse.json({ error: "Failed to update cloud config." }, { status: res.status || 502 });
    }
    return NextResponse.json(mapPlatformConfig(data as PlatformConfig));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud config failed" }, { status: 502 });
  }
}
