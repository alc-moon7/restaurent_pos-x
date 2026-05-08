import { NextResponse } from "next/server";
import { mapPlatformMenu, platformFetch, readPlatformJson, type PlatformMenuCategory } from "@/lib/platform-api";

export async function GET() {
  try {
    const res = await platformFetch("/staff/menu", { auth: "required" });
    const data = await readPlatformJson<PlatformMenuCategory[]>(res);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to load menu." }, { status: res.status || 502 });
    }
    return NextResponse.json(mapPlatformMenu(data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud menu failed" }, { status: 502 });
  }
}
