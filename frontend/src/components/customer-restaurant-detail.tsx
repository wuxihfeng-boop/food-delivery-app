"use client";

import { useEffect, useState, useTransition } from "react";

import { CustomerSession } from "@/components/customer-session";
import { MenuList } from "@/components/menu-list";
import { getRestaurant, getRestaurantMenu } from "@/lib/api";
import { getRestaurantStatusLabel, translateErrorMessage } from "@/lib/display";
import { readSession, SESSION_EVENT } from "@/lib/session";
import { MenuItem, Restaurant } from "@/types";

export function CustomerRestaurantDetail({ restaurantId }: { restaurantId: number }) {
  const [token, setToken] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshRestaurantDetail(activeToken: string) {
    setRestaurant(null);
    setMenu([]);
    setMessage(null);
    startTransition(async () => {
      try {
        const [nextRestaurant, nextMenu] = await Promise.all([
          getRestaurant(restaurantId, activeToken),
          getRestaurantMenu(restaurantId, activeToken),
        ]);
        setRestaurant(nextRestaurant);
        setMenu(nextMenu);
      } catch (error) {
        setRestaurant(null);
        setMenu([]);
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "加载餐厅详情失败。");
      }
    });
  }

  useEffect(() => {
    const syncSession = () => {
      const session = readSession();
      setToken(session.user?.role === "customer" ? session.token : null);
    };

    syncSession();
    window.addEventListener(SESSION_EVENT, syncSession);
    return () => window.removeEventListener(SESSION_EVENT, syncSession);
  }, []);

  useEffect(() => {
    if (!token) {
      setRestaurant(null);
      setMenu([]);
      setMessage(null);
      return;
    }

    refreshRestaurantDetail(token);
  }, [restaurantId, token]);

  return (
    <div className="shell stack">
      <CustomerSession
        title="顾客登录"
        description="顾客必须先登录，登录后才能查看餐厅详情和菜单。"
      />

      {!token ? (
        <section className="sectionPanel empty">请先登录顾客账号，再查看餐厅详情。</section>
      ) : restaurant ? (
        <>
          <section className="editorialHero">
            <div className="editorialHeroMain">
              <div className="panelHeader">
                <span className="panelDot" />
                <span>顾客端 / 餐厅详情</span>
              </div>
              <span className="status">{getRestaurantStatusLabel(restaurant.status)}</span>
              <h1 className="editorialTitle">{restaurant.name}</h1>
              <p className="editorialLead">{restaurant.description}</p>
            </div>
            <aside className="editorialRailTicket">
              <span className="eyebrow">House Note</span>
              <div className="editorialRailLine">
                <span>当前餐厅</span>
                <strong>{restaurant.name}</strong>
              </div>
              <div className="editorialRailLine">
                <span>状态</span>
                <strong>{getRestaurantStatusLabel(restaurant.status)}</strong>
              </div>
              <button
                type="button"
                className="button secondaryButton"
                disabled={isPending}
                onClick={() => token && refreshRestaurantDetail(token)}
              >
                刷新详情
              </button>
            </aside>
          </section>
          <MenuList items={menu} />
        </>
      ) : (
        <section className="sectionPanel empty">没有找到这家餐厅，或你当前无权查看。</section>
      )}

      {isPending ? <p className="shell muted">正在加载餐厅详情...</p> : null}
      {message ? <p className="shell muted">{message}</p> : null}
    </div>
  );
}
