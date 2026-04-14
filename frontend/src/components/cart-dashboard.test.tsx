import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";

import { CartDashboard } from "@/components/cart-dashboard";
import {
  createOrder,
  deleteCartItem,
  getCart,
  getOrders,
  updateCartItem,
} from "@/lib/api";
import { readSession } from "@/lib/session";
import { Cart, Order } from "@/types";


vi.mock("@/lib/api", () => ({
  createOrder: vi.fn(),
  deleteCartItem: vi.fn(),
  getCart: vi.fn(),
  getOrders: vi.fn(),
  updateCartItem: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  SESSION_EVENT: "food-delivery-session-changed",
  readSession: vi.fn(),
}));

vi.mock("@/components/customer-session", () => ({
  CustomerSession: ({ title }: { title: string }) => createElement("div", null, title),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) =>
    createElement("a", { href, className }, children),
}));


const mockedGetCart = vi.mocked(getCart);
const mockedGetOrders = vi.mocked(getOrders);
const mockedUpdateCartItem = vi.mocked(updateCartItem);
const mockedDeleteCartItem = vi.mocked(deleteCartItem);
const mockedCreateOrder = vi.mocked(createOrder);
const mockedReadSession = vi.mocked(readSession);

const cart: Cart = {
  id: 1,
  user_id: 1,
  restaurant_id: 1,
  total_amount: 28.5,
  items: [
    {
      id: 7,
      menu_item_id: 101,
      menu_item_name: "Beef Rice",
      quantity: 1,
      unit_price: 28.5,
      line_total: 28.5,
    },
  ],
};

const updatedCart: Cart = {
  ...cart,
  total_amount: 57,
  items: [{ ...cart.items[0], quantity: 2, line_total: 57 }],
};

const emptyCart: Cart = {
  ...cart,
  total_amount: 0,
  items: [],
};

const orders: Order[] = [
  {
    id: 12,
    restaurant_id: 1,
    status: "pending",
    total_amount: 28.5,
    created_at: "2026-04-14T10:00:00Z",
    items: [{ id: 1, menu_item_id: 101, menu_item_name: "Beef Rice", quantity: 1, unit_price: 28.5 }],
  },
];

const refreshedOrders: Order[] = [
  ...orders,
  {
    id: 13,
    restaurant_id: 1,
    status: "pending",
    total_amount: 57,
    created_at: "2026-04-14T11:00:00Z",
    items: [{ id: 2, menu_item_id: 101, menu_item_name: "Beef Rice", quantity: 2, unit_price: 28.5 }],
  },
];

describe("CartDashboard", () => {
  beforeEach(() => {
    mockedReadSession.mockReturnValue({
      token: "customer-token",
      user: { id: 1, role: "customer", name: "Alice", email: "alice@example.com" },
    });
    mockedGetCart.mockResolvedValue(cart);
    mockedGetOrders.mockResolvedValue(orders);
    mockedUpdateCartItem.mockResolvedValue(updatedCart);
    mockedDeleteCartItem.mockResolvedValue(emptyCart);
    mockedCreateOrder.mockResolvedValue({
      id: 13,
      restaurant_id: 1,
      status: "pending",
      total_amount: 57,
      created_at: "2026-04-14T11:00:00Z",
      items: [{ id: 2, menu_item_id: 101, menu_item_name: "Beef Rice", quantity: 2, unit_price: 28.5 }],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("updates cart item quantity from the increment control", async () => {
    render(createElement(CartDashboard));

    expect(await screen.findByText("Beef Rice")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(mockedUpdateCartItem).toHaveBeenCalledWith("customer-token", 7, { quantity: 2 });
      expect(screen.getAllByText("¥57.00")).toHaveLength(2);
    });
  });

  it("removes a cart item and shows the empty state", async () => {
    render(createElement(CartDashboard));

    await screen.findByText("Beef Rice");
    await userEvent.click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(mockedDeleteCartItem).toHaveBeenCalledWith("customer-token", 7);
      expect(screen.getByText("购物车还是空的。先去餐厅菜单页挑选至少一个可下单商品吧。")).toBeInTheDocument();
    });
  });

  it("submits an order and refreshes cart and order history", async () => {
    mockedGetCart
      .mockResolvedValueOnce(cart)
      .mockResolvedValueOnce(emptyCart);
    mockedGetOrders
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce(refreshedOrders);

    render(createElement(CartDashboard));

    await screen.findByText("Beef Rice");
    await userEvent.click(screen.getByRole("button", { name: "提交订单" }));

    await waitFor(() => {
      expect(mockedCreateOrder).toHaveBeenCalledWith("customer-token");
      expect(mockedGetCart).toHaveBeenCalledTimes(2);
      expect(mockedGetOrders).toHaveBeenCalledTimes(2);
      expect(screen.getByText("订单 #13 已提交成功。")).toBeInTheDocument();
      expect(screen.getByText("订单 #13")).toBeInTheDocument();
    });
  });
});
