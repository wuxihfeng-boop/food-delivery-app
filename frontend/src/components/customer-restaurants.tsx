"use client";

import { useEffect, useState, useTransition } from "react";

import { CustomerSession } from "@/components/customer-session";
import { RestaurantCard } from "@/components/restaurant-card";
import { getRestaurants } from "@/lib/api";
import { translateErrorMessage } from "@/lib/display";
import { readSession, SESSION_EVENT } from "@/lib/session";
import { Restaurant } from "@/types";

export function CustomerRestaurants() {
  const [token, setToken] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRestaurants = restaurants.filter((restaurant) => {
    if (!normalizedSearch) {
      return true;
    }

    return [restaurant.name, restaurant.description].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    );
  });

  function refreshRestaurants(activeToken: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const nextRestaurants = await getRestaurants(activeToken);
        setRestaurants(nextRestaurants);
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "加载餐厅失败。");
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
      setRestaurants([]);
      return;
    }

    refreshRestaurants(token);
  }, [token]);

  return (
    <div className="shell stack">
      <CustomerSession
        title="顾客登录"
        description="顾客必须先登录，登录后才能查看餐厅、菜单、购物车和订单。"
      />

      {!token ? (
        <section className="sectionPanel empty">请先登录顾客账号，再查看餐厅内容。</section>
      ) : (
        <>
          <section className="editorialHero">
            <div className="editorialHeroMain">
              <div className="panelHeader">
                <span className="panelDot" />
                <span>顾客端 / 餐厅列表</span>
              </div>
              <h1 className="editorialTitle">先挑餐厅，再决定今天这顿饭从哪一家开始。</h1>
              <p className="editorialLead">
                这一页专注顾客浏览节奏。先看营业中的餐厅，按名称和简介快速缩小范围，再进入菜单页处理可售商品和购物车。
              </p>
            </div>
            <aside className="editorialRailTicket">
              <span className="eyebrow">Customer Brief</span>
              <div className="editorialRailLine">
                <span>营业中</span>
                <strong>{filteredRestaurants.length} 家</strong>
              </div>
              <div className="editorialRailLine">
                <span>当前搜索</span>
                <strong>{search.trim() || "未筛选"}</strong>
              </div>
              <div className="editorialRailLine">
                <span>动作</span>
                <strong>浏览 / 进店 / 加购</strong>
              </div>
            </aside>
          </section>

          <section className="sectionPanel editorialSurface">
            <div className="toolbarRow">
              <input
                className="toolbarSearch"
                placeholder="搜索餐厅名称或简介"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="toolbarActions">
                <span className="headerChip">营业中 {filteredRestaurants.length} 家</span>
                <button type="button" className="button" disabled={isPending} onClick={() => token && refreshRestaurants(token)}>
                  刷新列表
                </button>
              </div>
            </div>
            {filteredRestaurants.length > 0 ? (
              <div className="grid">
                {filteredRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            ) : restaurants.length > 0 ? (
              <div className="empty">没有匹配当前搜索条件的餐厅。</div>
            ) : (
              <div className="empty">当前没有营业中的餐厅。</div>
            )}
          </section>
        </>
      )}

      {isPending ? <p className="shell muted">正在加载餐厅数据...</p> : null}
      {message ? <p className="shell muted">{message}</p> : null}
    </div>
  );
}
