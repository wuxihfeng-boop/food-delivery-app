import { Cart } from "@/types";

export function CartView({ cart }: { cart: Cart | null }) {
  if (!cart || cart.items.length === 0) {
    return <div className="cartPanel empty">购物车为空。</div>;
  }

  return (
    <div className="cartPanel">
      <h1 className="sectionTitle">购物车</h1>
      {cart.items.map((item) => (
        <div key={item.id} className="cartItem">
          <div>
            <h3>{item.menu_item_name}</h3>
            <p className="muted">数量：{item.quantity}</p>
          </div>
          <div className="price">¥{item.line_total.toFixed(2)}</div>
        </div>
      ))}
      <div className="cartItem">
        <strong>合计</strong>
        <strong>¥{cart.total_amount.toFixed(2)}</strong>
      </div>
    </div>
  );
}
