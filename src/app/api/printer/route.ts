import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { platformFetch, readPlatformJson, type PlatformConfig } from "@/lib/platform-api";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await platformFetch("/staff/config", { auth: "required" }, request);
    const data = await readPlatformJson<PlatformConfig>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to load printer config." }, { status: res.status || 502 });
    }
    return NextResponse.json({
      connection_type: data.printer.connectionType,
      address: data.printer.address,
      paper_width: data.printer.paperWidth,
      device_id: data.printer.deviceId,
      auto_print_kitchen: data.printer.autoPrintKitchen,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud printer failed" }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    connection_type: string;
    address: string | null;
    paper_width: number;
  }>;

  try {
    const res = await platformFetch(
      "/staff/devices/printer",
      {
        method: "PATCH",
        auth: "required",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionType: body.connection_type,
          address: body.address,
          paperWidth: body.paper_width,
        }),
      },
      request
    );
    const data = await readPlatformJson<Record<string, unknown>>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to update printer config." }, { status: res.status || 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud printer failed" }, { status: 502 });
  }
}
