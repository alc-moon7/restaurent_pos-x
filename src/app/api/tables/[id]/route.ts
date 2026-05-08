import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { platformFetch } from "@/lib/platform-api";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: "available" | "occupied" | "reserved";
  };
  if (!body.status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  const res = await platformFetch(
    `/staff/tables/${id}`,
    {
      method: "PATCH",
      auth: "required",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: body.status }),
    },
    request
  );
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to update table." }, { status: res.status || 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const res = await platformFetch(
      `/staff/tables/${id}`,
      { method: "DELETE", auth: "required" },
      request
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to delete table." }, { status: res.status || 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud tables failed" }, { status: 502 });
  }
}
