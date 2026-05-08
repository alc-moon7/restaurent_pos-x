export const DEFAULT_CUSTOMER_PLATFORM_API_BASE_URL =
  "https://vnhxfvtpkgykatvbrczn.supabase.co/functions/v1/pos-api";

const MOON_TEST_4_RESTAURANT_ID = "rest_c46f1be2fa034b11b0";
const MOON_TEST_4_OUTLET_ID = "outlet_0884a3c2b8314bfb9c";

export type PublicMenuTarget = {
  restaurantId: string;
  outletId: string;
  tableId: string;
};

export function getConfiguredPublicMenuTarget(): PublicMenuTarget {
  return {
    restaurantId:
      readEnv("NEXT_PUBLIC_RESTAURANT_ID", "PUBLIC_RESTAURANT_ID", "RESTAURANT_ID") ??
      MOON_TEST_4_RESTAURANT_ID,
    outletId:
      readEnv("NEXT_PUBLIC_OUTLET_ID", "PUBLIC_OUTLET_ID", "OUTLET_ID") ??
      MOON_TEST_4_OUTLET_ID,
    tableId:
      readEnv("NEXT_PUBLIC_DEFAULT_TABLE_ID", "PUBLIC_DEFAULT_TABLE_ID", "DEFAULT_TABLE_ID") ??
      "A1",
  };
}

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}
