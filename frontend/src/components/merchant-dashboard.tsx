"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { RoleSession } from "@/components/role-session";
import {
  createMerchantMenuItem,
  createMerchantRestaurant,
  deleteMerchantMenuItem,
  getMerchantMenuItems,
  getMerchantOrders,
  getMerchantRestaurants,
  updateMerchantMenuItem,
  updateMerchantOrderStatus,
} from "@/lib/api";
import {
  getAllowedMerchantOrderStatuses,
  getOrderStatusLabel,
  getRestaurantStatusLabel,
  translateErrorMessage,
} from "@/lib/display";
import { readSession, SESSION_EVENT } from "@/lib/session";
import { MenuItem, Order, Restaurant } from "@/types";

const initialRestaurantForm = { name: "", description: "" };
const initialMenuForm = { restaurant_id: "", name: "", description: "", price: "", is_available: true };

export function MerchantDashboard() {
  const menuFormRef = useRef<HTMLFormElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | Order["status"]>("all");
  const [restaurantForm, setRestaurantForm] = useState(initialRestaurantForm);
  const [menuForm, setMenuForm] = useState(initialMenuForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedMenuSearch = menuSearch.trim().toLowerCase();
  const filteredMenuItems = menuItems.filter((item) => {
    if (!normalizedMenuSearch) {
      return true;
    }

    const restaurantName = restaurants.find((restaurant) => restaurant.id === item.restaurant_id)?.name ?? "";
    return [item.name, item.description, restaurantName, String(item.restaurant_id), String(item.id)].some((value) =>
      value.toLowerCase().includes(normalizedMenuSearch),
    );
  });
  const filteredOrders = orders.filter((order) => orderStatusFilter === "all" || order.status === orderStatusFilter);

  useEffect(() => {
    const syncSession = () => {
      const nextSession = readSession();
      setToken(nextSession.user?.role === "merchant" ? nextSession.token : null);
    };

    syncSession();
    window.addEventListener(SESSION_EVENT, syncSession);
    return () => window.removeEventListener(SESSION_EVENT, syncSession);
  }, []);

  useEffect(() => {
    if (!token) {
      setRestaurants([]);
      setMenuItems([]);
      setOrders([]);
      return;
    }

    runRefresh(token);
  }, [token]);

  function runRefresh(activeToken: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const [nextRestaurants, nextMenuItems, nextOrders] = await Promise.all([
          getMerchantRestaurants(activeToken),
          getMerchantMenuItems(activeToken),
          getMerchantOrders(activeToken),
        ]);
        setRestaurants(nextRestaurants);
        setMenuItems(nextMenuItems);
        setOrders(nextOrders);
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "加载商家数据失败。");
      }
    });
  }

  async function refreshAll(activeToken: string) {
    const [nextRestaurants, nextMenuItems, nextOrders] = await Promise.all([
      getMerchantRestaurants(activeToken),
      getMerchantMenuItems(activeToken),
      getMerchantOrders(activeToken),
    ]);
    setRestaurants(nextRestaurants);
    setMenuItems(nextMenuItems);
    setOrders(nextOrders);
  }

  function focusMenuForm() {
    menuFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const firstField = menuFormRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>("select, input");
      firstField?.focus();
    }, 120);
  }

  function runAction(action: () => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "商家操作失败。");
      }
    });
  }

  function handleRestaurantCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    runAction(async () => {
      const restaurant = await createMerchantRestaurant(token, restaurantForm);
      setRestaurantForm(initialRestaurantForm);
      await refreshAll(token);
      setMenuForm((current) => ({ ...current, restaurant_id: String(restaurant.id) }));
      setMessage(`餐厅 #${restaurant.id} 创建成功。`);
    });
  }

  function handleMenuCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    runAction(async () => {
      await createMerchantMenuItem(token, {
        restaurant_id: Number(menuForm.restaurant_id),
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        is_available: menuForm.is_available,
      });
      setMenuForm((current) => ({ ...initialMenuForm, restaurant_id: current.restaurant_id }));
      await refreshAll(token);
      setMessage("菜品创建成功。");
    });
  }

  function handleAvailabilityToggle(item: MenuItem) {
    if (!token) {
      return;
    }

    runAction(async () => {
      await updateMerchantMenuItem(token, item.id, { is_available: !item.is_available });
      await refreshAll(token);
    });
  }

  function handleDelete(itemId: number) {
    if (!token) {
      return;
    }

    runAction(async () => {
      await deleteMerchantMenuItem(token, itemId);
      await refreshAll(token);
    });
  }

  function handleOrderStatus(orderId: number, status: Order["status"]) {
    if (!token) {
      return;
    }

    runAction(async () => {
      await updateMerchantOrderStatus(token, orderId, status);
      await refreshAll(token);
    });
  }

  return (
    <div className="shell stack">
      <RoleSession
        role="merchant"
        title="商家入口"
        description="创建自己的餐厅，发布菜单，并更新订单状态。"
        onSessionChange={(session) => setToken(session.user?.role === "merchant" ? session.token : null)}
      />

      {!token ? (
        <div className="sectionPanel empty">请先登录商家账号，再管理餐厅、菜单和订单。</div>
      ) : (
        <>
          <section className="editorialHero">
            <div className="editorialHeroMain">
              <div className="panelHeader">
                <span className="panelDot" />
                <span>商家端 / 营业简报</span>
              </div>
              <h1 className="editorialTitle">把店、菜品和订单都放进同一张当日营业版面里。</h1>
              <p className="editorialLead">
                商家端不是信息浏览页，而是经营操作页。先维护门店与菜品，再沿着订单状态从待处理推进到完成或取消。
              </p>
            </div>
            <aside className="editorialRailTicket">
              <span className="eyebrow">Merchant Brief</span>
              <div className="editorialRailLine">
                <span>我的餐厅</span>
                <strong>{restaurants.length} 家</strong>
              </div>
              <div className="editorialRailLine">
                <span>菜品数</span>
                <strong>{menuItems.length} 个</strong>
              </div>
              <div className="editorialRailLine">
                <span>订单数</span>
                <strong>{orders.length} 笔</strong>
              </div>
            </aside>
          </section>

          <section className="metricsGrid">
            <article className="metricCard">
              <span className="metricLabel">我的餐厅</span>
              <strong className="metricValue">{restaurants.length}</strong>
              <span className="metricHint">已创建餐厅数量</span>
            </article>
            <article className="metricCard">
              <span className="metricLabel">菜单商品</span>
              <strong className="metricValue">{menuItems.length}</strong>
              <span className="metricHint">当前可管理菜品数</span>
            </article>
            <article className="metricCard">
              <span className="metricLabel">订单</span>
              <strong className="metricValue">{orders.length}</strong>
              <span className="metricHint">待处理与历史订单</span>
            </article>
          </section>

          <section className="sectionPanel stack">
            <div className="panelHeader">
              <span className="panelDot" />
              <span>商家端 / 餐厅管理</span>
            </div>
            <div>
              <h1 className="sectionTitle">我的餐厅</h1>
              <p className="muted">当前 MVP 中，每个商家账号都可以创建并管理自己的餐厅。</p>
            </div>
            <form className="authGrid" onSubmit={handleRestaurantCreate}>
              <input
                className="field"
                placeholder="餐厅名称"
                value={restaurantForm.name}
                onChange={(event) => setRestaurantForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <input
                className="field"
                placeholder="餐厅简介"
                value={restaurantForm.description}
                onChange={(event) =>
                  setRestaurantForm((current) => ({ ...current, description: event.target.value }))
                }
                required
              />
              <button type="submit" disabled={isPending}>
                创建餐厅
              </button>
            </form>
            {restaurants.length === 0 ? (
              <div className="empty">你还没有创建餐厅。</div>
            ) : (
              <div className="grid">
                {restaurants.map((restaurant) => (
                  <div key={restaurant.id} className="card">
                    <span className="status">{getRestaurantStatusLabel(restaurant.status)}</span>
                    <h3>{restaurant.name}</h3>
                    <p className="muted">{restaurant.description}</p>
                    <p className="muted">餐厅 ID：{restaurant.id}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sectionPanel stack">
            <div className="panelHeader">
              <span className="panelDot" />
              <span>商家端 / 菜单管理</span>
            </div>
            <div>
              <h2 className="sectionTitle">菜单管理</h2>
              <p className="muted">选择一家餐厅，为顾客创建可下单的菜单商品。</p>
            </div>
            <div className="toolbarRow">
              <input
                className="toolbarSearch"
                placeholder="搜索菜品、描述、餐厅名称或 ID"
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
              />
              <div className="toolbarActions">
                <span className="headerChip">命中 {filteredMenuItems.length} 个菜品</span>
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={isPending}
                  onClick={() => token && runRefresh(token)}
                >
                  刷新数据
                </button>
                <button type="button" className="button" onClick={focusMenuForm}>
                  创建菜品
                </button>
              </div>
            </div>
            <form ref={menuFormRef} className="merchantForm" onSubmit={handleMenuCreate}>
              <select
                className="field"
                value={menuForm.restaurant_id}
                onChange={(event) => setMenuForm((current) => ({ ...current, restaurant_id: event.target.value }))}
                required
              >
                <option value="">请选择餐厅</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
              <input
                className="field"
                placeholder="菜品名称"
                value={menuForm.name}
                onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <input
                className="field"
                placeholder="菜品描述"
                value={menuForm.description}
                onChange={(event) => setMenuForm((current) => ({ ...current, description: event.target.value }))}
                required
              />
              <input
                className="field"
                placeholder="价格"
                type="number"
                min="0"
                step="0.01"
                value={menuForm.price}
                onChange={(event) => setMenuForm((current) => ({ ...current, price: event.target.value }))}
                required
              />
              <label className="toggleRow">
                <input
                  type="checkbox"
                  checked={menuForm.is_available}
                  onChange={(event) => setMenuForm((current) => ({ ...current, is_available: event.target.checked }))}
                />
                <span>允许顾客下单</span>
              </label>
              <button type="submit" disabled={isPending || restaurants.length === 0}>
                保存菜品
              </button>
            </form>
            {filteredMenuItems.length === 0 && menuItems.length > 0 ? (
              <div className="empty">没有匹配当前搜索条件的菜品。</div>
            ) : menuItems.length === 0 ? (
              <div className="empty">当前还没有菜品。</div>
            ) : (
              <div className="stack">
                {filteredMenuItems.map((item) => (
                  <div key={item.id} className="menuItem">
                    <div>
                      <h3>{item.name}</h3>
                      <p className="muted">{item.description}</p>
                      <p className="muted">
                        餐厅 #{item.restaurant_id} · ¥{item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="cartActions">
                      <span className="status">{item.is_available ? "可下单" : "已售罄"}</span>
                      <button type="button" onClick={() => handleAvailabilityToggle(item)} disabled={isPending}>
                        {item.is_available ? "标记售罄" : "恢复可售"}
                      </button>
                      <button
                        type="button"
                        className="button secondaryButton"
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sectionPanel">
            <div className="panelHeader">
              <span className="panelDot" />
              <span>商家端 / 订单管理</span>
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
            <h2 className="sectionTitle">订单管理</h2>
            {filteredOrders.length === 0 && orders.length > 0 ? (
              <div className="empty">当前筛选条件下没有订单。</div>
            ) : orders.length === 0 ? (
              <div className="empty">当前还没有新订单。</div>
            ) : (
              <div className="stack">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="card stack compactStack">
                    <div className="menuItem">
                      <div>
                        <h3>订单 #{order.id}</h3>
                        <p className="muted">
                          餐厅 #{order.restaurant_id} · ¥{order.total_amount.toFixed(2)}
                        </p>
                      </div>
                      <select
                        className="field"
                        value={order.status}
                        onChange={(event) => handleOrderStatus(order.id, event.target.value as Order["status"])}
                      >
                        {getAllowedMerchantOrderStatuses(order.status).map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {getOrderStatusLabel(statusOption)}
                          </option>
                        ))}
                      </select>
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

      {message ? <p className="shell muted">{message}</p> : null}
    </div>
  );
}
