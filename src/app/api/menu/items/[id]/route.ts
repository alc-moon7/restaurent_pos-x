import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    categoryId?: string | null;
    name?: string;
    description?: string | null;
    price?: number;
    image?: string | null;
    available?: boolean;
  };

  try {
    const { platformFetch, readPlatformJson } = await import("@/lib/platform-api");
    const res = await platformFetch(
      `/staff/menu/items/${id}`,
      {
        method: "PATCH",
        auth: "required",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: body.categoryId,
          name: body.name,
          description: body.description,
          price: body.price,
          imageUrl: body.image,
          isAvailable: body.available,
        }),
      },
      request
    );
    const data = await readPlatformJson<{ id: string }>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to update menu item." }, { status: res.status || 502 });
    }
    return NextResponse.json({
      id: data.id ?? id,
      category_id: body.categoryId ?? null,
      name: body.name ?? "",
      description: body.description ?? null,
      price: Number(body.price ?? 0),
      image: body.image ?? null,
      available: body.available === false ? 0 : 1,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud menu failed" }, { status: 502 });
  }
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
    const { platformFetch } = await import("@/lib/platform-api");
    const res = await platformFetch(
      `/staff/menu/items/${id}`,
      { method: "DELETE", auth: "required" },
      request
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to delete menu item." }, { status: res.status || 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud menu failed" }, { status: 502 });
  }
}
