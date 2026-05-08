import { NextRequest, NextResponse } from "next/server";
import { platformFetch, readPlatformPayload } from "@/lib/platform-api";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.search;
    const upstream = await platformFetch(`/owner/payments/status${search}`, { auth: "none" }, request);
    const { data, detail } = await readPlatformPayload<unknown>(upstream);
    if (data !== null) {
      return NextResponse.json(data, { status: upstream.status });
    }
    return NextResponse.json(
      { detail: detail ?? "Unable to fetch payment status" },
      { status: upstream.status || 502 }
    );
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to fetch payment status" },
      { status: 502 }
    );
  }
}
