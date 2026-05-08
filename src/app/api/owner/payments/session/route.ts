import { NextRequest, NextResponse } from "next/server";
import { platformFetch, readPlatformPayload } from "@/lib/platform-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = await platformFetch("/owner/payments/session", {
      method: "POST",
      auth: "none",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const { data, detail } = await readPlatformPayload<unknown>(upstream);
    if (data !== null) {
      return NextResponse.json(data, { status: upstream.status });
    }
    return NextResponse.json(
      { detail: detail ?? "Unable to start payment" },
      { status: upstream.status || 502 }
    );
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to start payment" },
      { status: 502 }
    );
  }
}
