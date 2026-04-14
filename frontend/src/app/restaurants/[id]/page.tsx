import { notFound } from "next/navigation";

import { CustomerRestaurantDetail } from "@/components/customer-restaurant-detail";

export default async function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurantId = Number(id);

  if (Number.isNaN(restaurantId)) {
    notFound();
  }

  return <CustomerRestaurantDetail restaurantId={restaurantId} />;
}
