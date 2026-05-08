import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mapPlatformTables, platformFetch, readPlatformJson, type PlatformTable } from "@/lib/platform-api";

export async function GET(request: NextRequest) {
  try {
    const res = await platformFetch("/staff/tables", { auth: "required" }, request);
    const data = await readPlatformJson<PlatformTable[]>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to load tables." }, { status: res.status || 502 });
    }
    return NextResponse.json(mapPlatformTables(data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud tables failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    capacity?: number;
    status?: "available" | "occupied" | "reserved";
  };

  try {
    const res = await platformFetch(
      "/staff/tables",
      {
        method: "POST",
        auth: "required",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: body.name ?? "",
          seats: body.capacity ?? 4,
          status: body.status ?? "available",
        }),
      },
      request
    );
    const data = await readPlatformJson<PlatformTable>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create table." }, { status: res.status || 502 });
    }
    return NextResponse.json(mapPlatformTables([data])[0]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud tables failed" }, { status: 502 });
  }
}
