import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await platformFetch("/staff/menu/categories", { auth: "required" }, request);
    const data = await readPlatformJson<Array<{ id: string; name: string; sortOrder: number }>>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to load categories." }, { status: res.status || 502 });
    }
    return NextResponse.json(
      data.map((category) => ({
        id: category.id,
        name: category.name,
        sort_order: category.sortOrder,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud menu failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string; sortOrder?: number };
  try {
    const res = await platformFetch(
      "/staff/menu/categories",
      {
        method: "POST",
        auth: "required",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: body.name ?? "", sortOrder: body.sortOrder ?? 0 }),
      },
      request
    );
    const data = await readPlatformJson<{ id: string; name: string; sortOrder: number }>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create category." }, { status: res.status || 502 });
    }
    return NextResponse.json({
      id: data.id,
      name: data.name,
      sort_order: data.sortOrder,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud menu failed" }, { status: 502 });
  }
}
