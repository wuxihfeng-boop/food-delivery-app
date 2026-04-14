"use client";

import { useEffect, useState, useTransition } from "react";

import { addCartItem } from "@/lib/api";
import { translateErrorMessage } from "@/lib/display";
import { readSession, SESSION_EVENT } from "@/lib/session";
import { MenuItem } from "@/types";

export function MenuList({ items }: { items: MenuItem[] }) {
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  const visibleItems = availableOnly ? items.filter((item) => item.is_available) : items;

  useEffect(() => {
    const syncSession = () => {
      const session = readSession();
      setToken(session.user?.role === "customer" ? session.token : null);
    };

    syncSession();
    window.addEventListener(SESSION_EVENT, syncSession);
    return () => window.removeEventListener(SESSION_EVENT, syncSession);
  }, []);

  function handleAdd(menuItemId: number) {
    if (!token) {
      setMessage("加购前请先登录顾客账号。");
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const cart = await addCartItem(token, { menu_item_id: menuItemId, quantity: 1 });
        setMessage(`已加入购物车，当前合计 ¥${cart.total_amount.toFixed(2)}`);
      } catch (error) {
        setMessage(error instanceof Error ? translateErrorMessage(error.message) : "加入购物车失败。");
      }
    });
  }

  if (items.length === 0) {
    return <div className="empty">当前还没有可展示的菜品。</div>;
  }

  return (
    <div className="sectionPanel editorialSurface">
      <div className="panelHeader">
        <span className="panelDot" />
        <span>顾客端 / 菜单</span>
      </div>
      <div className="toolbarRow">
        <div className="toolbarSearch">浏览当前餐厅可下单菜品</div>
        <div className="toolbarActions">
          <span className="headerChip">{availableOnly ? "仅看可售" : "全部菜品"}</span>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => setAvailableOnly((current) => !current)}
          >
            {availableOnly ? "显示全部" : "仅看可下单"}
          </button>
        </div>
      </div>
      <h2 className="sectionTitle">菜单</h2>
      {visibleItems.length === 0 ? <div className="empty">当前没有可下单菜品。</div> : null}
      {visibleItems.map((item) => (
        <div key={item.id} className="menuItem editorialMenuRow">
          <div>
            <span className="eyebrow">Menu #{item.id}</span>
            <h3>{item.name}</h3>
            <p className="muted">{item.description || "这家餐厅当前还没有补充菜品描述。"}</p>
            <span className="status">{item.is_available ? "可下单" : "已售罄"}</span>
          </div>
          <div className="stack" style={{ justifyItems: "end" }}>
            <span className="price">¥{item.price.toFixed(2)}</span>
            <button type="button" disabled={!item.is_available || isPending} onClick={() => handleAdd(item.id)}>
              {item.is_available ? "加入购物车" : "已售罄"}
            </button>
          </div>
        </div>
      ))}
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
