import { getConfiguredPublicMenuTarget } from "@/lib/public-menu-deployment";
import { redirect } from "next/navigation";

export default function Home() {
  const target = getConfiguredPublicMenuTarget();
  const params = new URLSearchParams({ table: target.tableId });
  redirect(`/r/${target.restaurantId}/o/${target.outletId}?${params.toString()}`);
}
