import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mapPlatformMenu, platformFetch, readPlatformJson, type PlatformMenuCategory } from "@/lib/platform-api";

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    categoryId?: string | null;
    name?: string;
    description?: string | null;
    price?: number;
    image?: string | null;
    available?: boolean;
  };

  try {
    const res = await platformFetch(
      "/staff/menu/items",
      {
        method: "POST",
        auth: "required",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: body.categoryId ?? null,
          name: body.name ?? "",
          description: body.description ?? null,
          price: Number(body.price ?? NaN),
          imageUrl: body.image ?? null,
          isAvailable: body.available ?? true,
        }),
      },
      request
    );
    const data = await readPlatformJson<PlatformMenuCategory[] | { id?: string }>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create menu item." }, { status: res.status || 502 });
    }
    if (Array.isArray(data)) {
      const mapped = mapPlatformMenu(data).flatMap((category) => category.items);
      return NextResponse.json(mapped[mapped.length - 1] ?? null);
    }
    return NextResponse.json({
      id: data.id ?? "",
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
