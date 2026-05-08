import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMenuBaseUrl, getPlatformContext } from "@/lib/platform-api";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tableId: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tableId } = await context.params;
  const tableName = new URL(request.url).searchParams.get("tableName")?.trim() || tableId;
  const session = await getPlatformContext(request);
  if (!session?.restaurantId || !session.outletId) {
    return NextResponse.json({ error: "Missing outlet context" }, { status: 400 });
  }
  const url = `${getMenuBaseUrl(request)}/r/${session.restaurantId}/o/${session.outletId}?table=${encodeURIComponent(tableName)}`;

  return NextResponse.json(
    { url, tableId, tableName },
    { headers: { "Cache-Control": "no-store" } }
  );
}
