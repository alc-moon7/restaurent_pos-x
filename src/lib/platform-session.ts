export const PLATFORM_ACCESS_COOKIE = "pos_platform_access";
export const PLATFORM_CONTEXT_COOKIE = "pos_platform_context";
export const OWNER_ACCESS_COOKIE = "pos_owner_access";

export type PlatformSessionContext = {
  restaurantId: string;
  restaurantName: string;
  restaurantStatus: string;
  outletId: string;
  outletName: string;
  subscriptionStatus: string;
  planName: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  menuDomain: string | null;
};

export type OwnerSessionContext = {
  ownerId: string;
  phone: string;
  hasRestaurant: boolean;
};

export function encodePlatformContext(context: PlatformSessionContext) {
  return Buffer.from(JSON.stringify(context), "utf8").toString("base64url");
}

export function decodePlatformContext(value: string | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PlatformSessionContext;
  } catch {
    return null;
  }
}

export function encodeOwnerContext(context: OwnerSessionContext) {
  return Buffer.from(JSON.stringify(context), "utf8").toString("base64url");
}

export function decodeOwnerContext(value: string | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OwnerSessionContext;
  } catch {
    return null;
  }
}
