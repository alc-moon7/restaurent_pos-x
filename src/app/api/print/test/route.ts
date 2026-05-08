import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await platformFetch(
      "/staff/devices/printer/test",
      { method: "POST", auth: "required" },
      request
    );
    const data = await readPlatformJson<{ success?: boolean; error?: string }>(res);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error ?? "Test print failed" }, { status: res.status || 502 });
    }
    return NextResponse.json({ success: data.success ?? true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Cloud printer failed" },
      { status: 502 }
    );
  }
}
