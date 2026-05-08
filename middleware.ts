import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ROLE, AUTH_COOKIE_NAME, getJwtSecret } from "@/lib/auth-config";
import { PLATFORM_ACCESS_COOKIE, PLATFORM_CONTEXT_COOKIE } from "@/lib/platform-session";

const publicAdminRoutes = new Set(["/admin/login"]);

async function hasValidAdminSession(token: string) {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    return payload.role === ADMIN_ROLE;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (publicAdminRoutes.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const platformToken = request.cookies.get(PLATFORM_ACCESS_COOKIE)?.value;
  const platformContext = request.cookies.get(PLATFORM_CONTEXT_COOKIE)?.value;
  if (token && platformToken && platformContext && (await hasValidAdminSession(token))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
