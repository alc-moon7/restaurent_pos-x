import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-config";
import { verifyAdminSessionToken } from "@/lib/auth";
import { PLATFORM_CONTEXT_COOKIE, decodePlatformContext } from "@/lib/platform-session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifyAdminSessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ authenticated: false, role: null });
  }

  return NextResponse.json({
    authenticated: true,
    role: session.role ?? null,
    context: decodePlatformContext(request.cookies.get(PLATFORM_CONTEXT_COOKIE)?.value),
  });
}
