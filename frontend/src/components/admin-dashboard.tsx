"use client";

import { useEffect, useState, useTransition } from "react";

import { RoleSession } from "@/components/role-session";
import { getAdminOrders, getAdminRestaurants } from "@/lib/api";
import { getOrderStatusLabel, getRestaurantStatusLabel, translateErrorMessage } from "@/lib/display";
import { readSession, SESSION_EVENT } from "@/lib/session";
import { Order, Restaurant } from "@/types";

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | Order["status"]>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedRestaurantSearch = restaurantSearch.trim().toLowerCase();
  const filteredRestaurants = restaurants.filter((restaurant) => {
    if (!normalizedRestaurantSearch) {
      return true;
    }

    return [
      restaurant.name,
      restaurant.description,
      String(restaurant.owner_user_id ?? ""),
      String(restaurant.id),
    ].some((value) => value.toLowerCase().includes(normalizedRestaurantSearch));
  });
  const filteredOrders = orders.filter((order) => orderStatusFilter === "all" || order.status === orderStatusFilter);

  function refreshAdminData(activeToken: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const [nextRestaurants, nextOrders] = await Promise.all([
          getAdminRestaurants(activeToken),
          getAdminOrders(activeToken),
        ]);
        setRestaurants(nextRestaurants);
        setOrders(nextOrders);
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "加载管理数据失败。");
      }
    });
  }

  useEffect(() => {
    const syncSession = () => {
      const nextSession = readSession();
      setToken(nextSession.user?.role === "admin" ? nextSession.token : null);
    };

    syncSession();
    window.addEventListener(SESSION_EVENT, syncSession);
    return () => window.removeEventListener(SESSION_EVENT, syncSession);
  }, []);

  useEffect(() => {
    if (!token) {
      setRestaurants([]);
      setOrders([]);
      return;
    }

    refreshAdminData(token);
  }, [token]);

  return (
    <div className="shell stack">
      <RoleSession
        role="admin"
        title="管理端入口"
        description="在一个页面里查看平台餐厅和订单总览。"
        onSessionChange={(session) => setToken(session.user?.role === "admin" ? session.token : null)}
      />

      {!token ? (
        <div className="sectionPanel empty">请先登录管理员账号，再查看平台数据。</div>
      ) : (
        <>
          <section className="editorialHero">
            <div className="editorialHeroMain">
              <div className="panelHeader">
                <span className="panelDot" />
                <span>管理端 / 平台快报</span>
              </div>
              <h1 className="editorialTitle">管理员看到的不是单店操作，而是整个平台的今日版面。</h1>
              <p className="editorialLead">
                这一页保留总览视角。通过餐厅搜索和订单状态筛选快速扫过平台层面的餐厅结构与订单分布，而不是介入每笔业务细节。
              </p>
            </div>
            <aside className="editorialRailTicket">
              <span className="eyebrow">Admin Brief</span>
              <div className="editorialRailLine">
                <span>餐厅总数</span>
                <strong>{restaurants.length} 家</strong>
              </div>
              <div className="editorialRailLine">
                <span>订单总数</span>
                <strong>{orders.length} 笔</strong>
              </div>
              <div className="editorialRailLine">
                <span>当前筛选</span>
                <strong>{orderStatusFilter === "all" ? "全部订单" : getOrderStatusLabel(orderStatusFilter)}</strong>
              </div>
            </aside>
          </section>

          <section className="metricsGrid">
            <article className="metricCard">
              <span className="metricLabel">餐厅总数</span>
              <strong className="metricValue">{restaurants.length}</strong>
              <span className="metricHint">平台已录入餐厅</span>
            </article>
            <article className="metricCard">
              <span className="metricLabel">订单总数</span>
              <strong className="metricValue">{orders.length}</strong>
              <span className="metricHint">平台累计订单</span>
            </article>
            <article className="metricCard">
              <span className="metricLabel">运行模式</span>
              <strong className="metricValue">MVP</strong>
              <span className="metricHint">PostgreSQL + FastAPI + Next.js</span>
            </article>
          </section>

          <section className="sectionPanel">
            <div className="panelHeader">
              <span className="panelDot" />
              <span>管理端 / 餐厅总览</span>
            </div>
            <div className="toolbarRow">
              <input
                className="toolbarSearch"
                placeholder="搜索餐厅、描述、餐厅 ID 或商家用户 ID"
                value={restaurantSearch}
                onChange={(event) => setRestaurantSearch(event.target.value)}
              />
              <div className="toolbarActions">
                <span className="headerChip">命中 {filteredRestaurants.length} 家</span>
                <button type="button" className="button" disabled={isPending} onClick={() => token && refreshAdminData(token)}>
                  刷新数据
                </button>
              </div>
            </div>
            <h1 className="sectionTitle">餐厅总览</h1>
            {filteredRestaurants.length === 0 && restaurants.length > 0 ? (
              <div className="empty">没有匹配当前搜索条件的餐厅。</div>
            ) : restaurants.length === 0 ? (
              <div className="empty">系统里还没有餐厅。</div>
            ) : (
              <div className="grid">
                {filteredRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="card">
                    <span className="status">{getRestaurantStatusLabel(restaurant.status)}</span>
                    <h3>{restaurant.name}</h3>
                    <p className="muted">{restaurant.description}</p>
                    <p className="muted">所属商家用户 ID：{restaurant.owner_user_id ?? "未分配"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sectionPanel">
            <div className="panelHeader">
              <span className="panelDot" />
              <span>管理端 / 订单总览</span>
            </div>
            <div className="toolbarRow">
              <select
                className="field"
                style={{ maxWidth: 260 }}
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value as "all" | Order["status"])}
              >
                <option value="all">全部订单状态</option>
                <option value="pending">{getOrderStatusLabel("pending")}</option>
                <option value="confirmed">{getOrderStatusLabel("confirmed")}</option>
                <option value="preparing">{getOrderStatusLabel("preparing")}</option>
                <option value="completed">{getOrderStatusLabel("completed")}</option>
                <option value="cancelled">{getOrderStatusLabel("cancelled")}</option>
              </select>
              <div className="toolbarActions">
                <span className="headerChip">订单 {filteredOrders.length} 笔</span>
              </div>
            </div>
            <h2 className="sectionTitle">订单总览</h2>
            {filteredOrders.length === 0 && orders.length > 0 ? (
              <div className="empty">当前筛选条件下没有订单记录。</div>
            ) : orders.length === 0 ? (
              <div className="empty">系统里还没有订单记录。</div>
            ) : (
              <div className="stack">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="card stack compactStack">
                    <div className="menuItem">
                      <div>
                        <h3>订单 #{order.id}</h3>
                        <p className="muted">
                          餐厅 #{order.restaurant_id} · 状态 {getOrderStatusLabel(order.status)}
                        </p>
                      </div>
                      <div className="price">¥{order.total_amount.toFixed(2)}</div>
                    </div>
                    {order.items.map((item) => (
                      <div key={item.id} className="orderRow">
                        <span>
                          {item.menu_item_name} x {item.quantity}
                        </span>
                        <span>¥{(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {isPending ? <p className="shell muted">正在刷新管理端数据...</p> : null}
      {message ? <p className="shell muted">{message}</p> : null}
    </div>
  );
}
