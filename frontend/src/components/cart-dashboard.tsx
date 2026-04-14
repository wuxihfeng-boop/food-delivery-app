"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { createOrder, deleteCartItem, getCart, getOrders, updateCartItem } from "@/lib/api";
import { getOrderStatusLabel, translateErrorMessage } from "@/lib/display";
import { readSession, SESSION_EVENT } from "@/lib/session";
import { Cart, Order } from "@/types";
import { CustomerSession } from "@/components/customer-session";

export function CartDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setCart(null);
      setOrders([]);
      return;
    }

    startTransition(async () => {
      try {
        const [nextCart, nextOrders] = await Promise.all([getCart(token), getOrders(token)]);
        setCart(nextCart);
        setOrders(nextOrders);
        setMessage(null);
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "加载顾客数据失败。");
      }
    });
  }, [token]);

  function runCartAction(action: () => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "购物车操作失败。");
      }
    });
  }

  async function refreshAll(activeToken: string) {
    const [nextCart, nextOrders] = await Promise.all([getCart(activeToken), getOrders(activeToken)]);
    setCart(nextCart);
    setOrders(nextOrders);
  }

  function handleQuantity(itemId: number, quantity: number) {
    if (!token) {
      return;
    }

    runCartAction(async () => {
      const nextCart = await updateCartItem(token, itemId, { quantity });
      setCart(nextCart);
    });
  }

  function handleRemove(itemId: number) {
    if (!token) {
      return;
    }

    runCartAction(async () => {
      const nextCart = await deleteCartItem(token, itemId);
      setCart(nextCart);
    });
  }

  function handleCheckout() {
    if (!token) {
      return;
    }

    runCartAction(async () => {
      const order = await createOrder(token);
      await refreshAll(token);
      setMessage(`订单 #${order.id} 已提交成功。`);
    });
  }

  return (
    <div className="stack">
      <CustomerSession
        title="顾客入口"
        description="使用顾客账号管理购物车，并通过 FastAPI 后端创建订单。"
        onSessionChange={(session) => setToken(session.user?.role === "customer" ? session.token : null)}
      />

      {!token ? (
        <div className="cartPanel empty">请先登录顾客账号，再查看购物车和订单历史。</div>
      ) : (
        <>
          <section className="editorialHero">
            <div className="editorialHeroMain">
              <div className="panelHeader">
                <span className="panelDot" />
                <span>顾客端 / 购物车与订单</span>
              </div>
              <h1 className="editorialTitle">把已经决定要买的东西整理成一张可提交的订单。</h1>
              <p className="editorialLead">
                购物车页负责最后一段顾客流程。这里不再是浏览，而是确认数量、删除不需要的商品，并把当前选择提交成订单记录。
              </p>
            </div>
            <aside className="editorialRailTicket">
              <span className="eyebrow">Cart Brief</span>
              <div className="editorialRailLine">
                <span>商品数</span>
                <strong>{cart?.items.length ?? 0}</strong>
              </div>
              <div className="editorialRailLine">
                <span>订单历史</span>
                <strong>{orders.length} 笔</strong>
              </div>
              <div className="editorialRailLine">
                <span>当前合计</span>
                <strong>¥{cart?.total_amount.toFixed(2) ?? "0.00"}</strong>
              </div>
            </aside>
          </section>

          <section className="cartPanel">
            <div className="panelHeader">
              <span className="panelDot" />
              <span>顾客端 / 购物车</span>
            </div>
            <h1 className="sectionTitle">购物车</h1>
            {!cart || cart.items.length === 0 ? (
              <div className="empty">
                购物车还是空的。先去餐厅菜单页挑选至少一个可下单商品吧。
                <div className="actions">
                  <Link href="/restaurants" className="button secondary">
                    去看餐厅
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {cart.items.map((item) => (
                  <div key={item.id} className="cartItem">
                    <div>
                      <h3>{item.menu_item_name}</h3>
                      <p className="muted">单价：¥{item.unit_price.toFixed(2)}</p>
                    </div>
                    <div className="cartActions">
                      <div className="quantityControl">
                        <button type="button" onClick={() => handleQuantity(item.id, Math.max(1, item.quantity - 1))}>
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => handleQuantity(item.id, item.quantity + 1)}>
                          +
                        </button>
                      </div>
                      <div className="price">¥{item.line_total.toFixed(2)}</div>
                      <button type="button" className="button secondaryButton" onClick={() => handleRemove(item.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                <div className="cartItem">
                  <strong>合计</strong>
                  <strong>¥{cart.total_amount.toFixed(2)}</strong>
                </div>
                <div className="actions">
                  <button type="button" onClick={handleCheckout} disabled={isPending}>
                    提交订单
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="sectionPanel">
            <div className="panelHeader">
              <span className="panelDot" />
              <span>顾客端 / 我的订单</span>
            </div>
            <h2 className="sectionTitle">我的订单</h2>
            {orders.length === 0 ? (
              <div className="empty">你还没有订单，完成下单后会显示在这里。</div>
            ) : (
              <div className="stack">
                {orders.map((order) => (
                  <div key={order.id} className="card">
                    <div className="menuItem">
                      <div>
                        <h3>订单 #{order.id}</h3>
                        <p className="muted">
                          {new Date(order.created_at).toLocaleString()} · 餐厅 #{order.restaurant_id}
                        </p>
                      </div>
                      <div className="stack" style={{ justifyItems: "end" }}>
                        <span className="status">{getOrderStatusLabel(order.status)}</span>
                        <span className="price">¥{order.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="stack compactStack">
                      {order.items.map((item) => (
                        <div key={item.id} className="orderRow">
                          <span>
                            {item.menu_item_name} x {item.quantity}
                          </span>
                          <span>¥{(item.quantity * item.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
