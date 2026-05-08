import { NextResponse } from "next/server";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";

export async function GET() {
  try {
    const res = await platformFetch("/health", { auth: "none" });
    const data = await readPlatformJson<Record<string, unknown>>(res);
    return NextResponse.json(
      {
        status: res.ok ? "ok" : "error",
        platform: data,
        uptime: process.uptime(),
        serverTime: new Date().toISOString(),
      },
      { status: res.ok ? 200 : res.status || 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Platform health failed",
        uptime: process.uptime(),
        serverTime: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
