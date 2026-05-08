import CustomerMenuClient from "@/app/menu/[tableId]/CustomerMenuClient";

export default async function PublicOutletMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string; outletId: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { restaurantId, outletId } = await params;
  const { table } = await searchParams;
  return <CustomerMenuClient restaurantId={restaurantId} outletId={outletId} tableId={table ?? null} />;
}
