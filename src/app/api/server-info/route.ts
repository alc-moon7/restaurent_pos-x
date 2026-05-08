import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMenuBaseUrl } from "@/lib/platform-api";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(getMenuBaseUrl(request));
  return NextResponse.json({
    host: url.hostname,
    protocol: url.protocol.replace(":", ""),
    baseUrl: getMenuBaseUrl(request),
  });
}
