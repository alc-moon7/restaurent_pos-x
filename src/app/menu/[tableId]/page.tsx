import CustomerMenuClient from "@/app/menu/[tableId]/CustomerMenuClient";
import { getConfiguredPublicMenuTarget } from "@/lib/public-menu-deployment";

export default async function TableEntryPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const target = getConfiguredPublicMenuTarget();

  return (
    <CustomerMenuClient
      restaurantId={target.restaurantId}
      outletId={target.outletId}
      tableId={tableId || target.tableId}
    />
  );
}
