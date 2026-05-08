import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
} from "@/lib/auth-config";
import { createAdminSessionToken } from "@/lib/auth";
import { platformFetch, readPlatformPayload } from "@/lib/platform-api";
import {
  OWNER_ACCESS_COOKIE,
  PLATFORM_ACCESS_COOKIE,
  PLATFORM_CONTEXT_COOKIE,
  encodePlatformContext,
  type PlatformSessionContext,
} from "@/lib/platform-session";

type OwnerLoginResponse = {
  ownerAccessToken?: string;
  accessToken?: string | null;
  owner?: { id: string; phone: string; hasRestaurant: boolean };
  restaurant?: { id: string; name: string; status: string };
  outlet?: { id: string; name: string };
  subscription?: { status: string; billingCycle?: string; planName: string };
  sync?: { status: string; lastSyncedAt: string | null };
  menuDomain?: string | null;
  detail?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upstream = await platformFetch("/owner/auth/login", {
      method: "POST",
      auth: "none",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const { data, detail } = await readPlatformPayload<OwnerLoginResponse>(upstream);
    if (!data) {
      return NextResponse.json(
        { success: false, message: detail ?? "Owner login failed" },
        { status: upstream.status || 502 }
      );
    }
    if (!upstream.ok || !data.ownerAccessToken) {
      return NextResponse.json(
        { success: false, message: data.detail ?? "Owner login failed" },
        { status: upstream.status || 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      hasRestaurant: data.owner?.hasRestaurant ?? false,
      restaurantName: data.restaurant?.name ?? null,
    });
    response.cookies.set(OWNER_ACCESS_COOKIE, data.ownerAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    if (data.accessToken && data.restaurant && data.outlet) {
      const context: PlatformSessionContext = {
        restaurantId: data.restaurant.id,
        restaurantName: data.restaurant.name,
        restaurantStatus: data.restaurant.status,
        outletId: data.outlet.id,
        outletName: data.outlet.name,
        subscriptionStatus: data.subscription?.status ?? "setup_pending",
        planName: data.subscription?.planName ?? "Cloud Starter",
        syncStatus: data.sync?.status ?? "pending",
        lastSyncedAt: data.sync?.lastSyncedAt ?? null,
        menuDomain: data.menuDomain ?? null,
      };
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
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Owner login failed" },
      { status: 502 }
    );
  }
}
