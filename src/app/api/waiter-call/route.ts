import { NextRequest, NextResponse } from "next/server";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    restaurantId?: string;
    outletId?: string;
    tableId?: string;
    tableName?: string | null;
  };
  if (!body.tableId) {
    return NextResponse.json({ success: false, error: "Invalid tableId" }, { status: 400 });
  }

  try {
    const path =
      body.restaurantId && body.outletId
        ? `/restaurants/${body.restaurantId}/outlets/${body.outletId}/waiter-call`
        : "/staff/notifications/waiter-call";
    const auth = body.restaurantId && body.outletId ? "none" : "optional";
    const res = await platformFetch(
      path,
      {
        method: "POST",
        auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: body.tableId,
          tableName: body.tableName ?? null,
        }),
      },
      request
    );
    const data = await readPlatformJson<{ success?: boolean; error?: string }>(res);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error ?? "Waiter call failed" }, { status: res.status || 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Waiter call failed" },
      { status: 502 }
    );
  }
}
