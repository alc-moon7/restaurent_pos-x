import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
} from "@/lib/auth-config";
import { createAdminSessionToken } from "@/lib/auth";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";
import {
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_CONTEXT_COOKIE,
  encodePlatformContext,
  type PlatformSessionContext,
} from "@/lib/platform-session";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { pin?: string };
  const pin = String(body.pin ?? "").trim();

  if (!pin) {
    return NextResponse.json(
      { success: false, message: "Missing PIN" },
      { status: 400 }
    );
  }

  try {
    const upstream = await platformFetch(
      "/staff/auth/login",
      {
        method: "POST",
        auth: "none",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      },
      request
    );
    const data = await readPlatformJson<{
      accessToken?: string;
      role?: string;
      restaurant?: { id: string; name: string; status: string };
      outlet?: { id: string; name: string };
      subscription?: { status: string; planName: string };
      sync?: { status: string; lastSyncedAt: string | null };
      menuDomain?: string | null;
      message?: string;
    }>(upstream);

    if (!upstream.ok || !data.accessToken) {
      return NextResponse.json(
        { success: false, message: data.message ?? "Incorrect PIN" },
        { status: upstream.status || 401 }
      );
    }

    const context: PlatformSessionContext = {
      restaurantId: data.restaurant?.id ?? "",
      restaurantName: data.restaurant?.name ?? "Restaurant",
      restaurantStatus: data.restaurant?.status ?? "trial",
      outletId: data.outlet?.id ?? "",
      outletName: data.outlet?.name ?? "Main Outlet",
      subscriptionStatus: data.subscription?.status ?? "trial",
      planName: data.subscription?.planName ?? "Starter",
      syncStatus: data.sync?.status ?? "pending",
      lastSyncedAt: data.sync?.lastSyncedAt ?? null,
      menuDomain: data.menuDomain ?? null,
    };

    const response = NextResponse.json({ success: true, context });
    response.cookies.set(AUTH_COOKIE_NAME, createAdminSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });
    response.cookies.set(PLATFORM_ACCESS_COOKIE, data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });
    response.cookies.set(PLATFORM_CONTEXT_COOKIE, encodePlatformContext(context), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Cloud login failed",
      },
      { status: 502 }
    );
  }
}
