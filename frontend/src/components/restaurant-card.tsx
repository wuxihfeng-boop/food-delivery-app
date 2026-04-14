import Link from "next/link";

import { getRestaurantStatusLabel } from "@/lib/display";
import { Restaurant } from "@/types";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <article className="card tableCard editorialCard">
      <div className="editorialCardHeader">
        <span className="status">{getRestaurantStatusLabel(restaurant.status)}</span>
        <span className="editorialCardId">#{restaurant.id}</span>
      </div>
      <h3>{restaurant.name}</h3>
      <p className="muted">{restaurant.description}</p>
      <div className="editorialCardFooter">
        <span className="muted">今日可进入菜单浏览与加购</span>
      </div>
      <Link className="button secondary" href={`/restaurants/${restaurant.id}`}>
        查看菜单
      </Link>
    </article>
  );
}
