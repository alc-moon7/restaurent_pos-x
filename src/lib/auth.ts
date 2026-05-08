import "server-only";

import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextRequest } from "next/server";
import {
  ADMIN_ROLE,
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  getJwtSecret,
} from "@/lib/auth-config";

type AdminSessionPayload = JwtPayload & {
  role?: string;
};

function parseBearer(authHeader: string | null) {
  if (!authHeader) return null;
  const [scheme, value] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  return value?.trim() || null;
}

export function createAdminSessionToken() {
  return jwt.sign(
    {
      role: ADMIN_ROLE,
      iat: Math.floor(Date.now() / 1000),
    },
    getJwtSecret(),
    { expiresIn: AUTH_COOKIE_MAX_AGE }
  );
}

export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AdminSessionPayload;
    if (payload.role !== ADMIN_ROLE) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireAdmin(request: NextRequest): boolean {
  const bearer = parseBearer(request.headers.get("authorization"));
  if (bearer && verifyAdminSessionToken(bearer)) return true;

  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken && verifyAdminSessionToken(cookieToken)) return true;

  return false;
}
