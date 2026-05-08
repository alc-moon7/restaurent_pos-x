import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const upstream = await platformFetch(`/staff/reports?${searchParams.toString()}`, { auth: "required" }, request);
    const data = await readPlatformJson<Record<string, unknown>>(upstream);
    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to load reports." }, { status: upstream.status || 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud reports failed" }, { status: 502 });
  }
}
