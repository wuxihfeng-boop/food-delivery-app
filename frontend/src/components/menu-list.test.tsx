import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { MenuList } from "@/components/menu-list";
import { addCartItem } from "@/lib/api";
import { readSession } from "@/lib/session";
import { MenuItem } from "@/types";


vi.mock("@/lib/api", () => ({
  addCartItem: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  SESSION_EVENT: "food-delivery-session-changed",
  readSession: vi.fn(),
}));


const mockedAddCartItem = vi.mocked(addCartItem);
const mockedReadSession = vi.mocked(readSession);

const menuItems: MenuItem[] = [
  { id: 1, restaurant_id: 1, name: "Beef Rice", description: "Braised beef", price: 28.5, is_available: true },
  { id: 2, restaurant_id: 1, name: "Sold Out Soup", description: "No stock", price: 12, is_available: false },
];

describe("MenuList", () => {
  beforeEach(() => {
    mockedReadSession.mockReturnValue({
      token: "customer-token",
      user: { id: 1, role: "customer", name: "Alice", email: "alice@example.com" },
    });
    mockedAddCartItem.mockResolvedValue({
      id: 1,
      user_id: 1,
      restaurant_id: 1,
      total_amount: 28.5,
      items: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters unavailable items when available-only mode is enabled", async () => {
    render(createElement(MenuList, { items: menuItems }));

    expect(screen.getByText("Beef Rice")).toBeInTheDocument();
    expect(screen.getByText("Sold Out Soup")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "仅看可下单" }));

    expect(screen.getByText("Beef Rice")).toBeInTheDocument();
    expect(screen.queryByText("Sold Out Soup")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "显示全部" })).toBeInTheDocument();
  });

  it("adds an available item to cart and shows success feedback", async () => {
    render(createElement(MenuList, { items: menuItems }));

    await userEvent.click(screen.getByRole("button", { name: "加入购物车" }));

    await waitFor(() => {
      expect(mockedAddCartItem).toHaveBeenCalledWith("customer-token", { menu_item_id: 1, quantity: 1 });
      expect(screen.getByText("已加入购物车，当前合计 ¥28.50")).toBeInTheDocument();
    });
  });

  it("shows the empty state when available-only mode hides every item", async () => {
    render(
      createElement(MenuList, {
        items: [{ id: 3, restaurant_id: 1, name: "Only Sold Out", description: "", price: 15, is_available: false }],
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "仅看可下单" }));

    expect(screen.getByText("当前没有可下单菜品。")).toBeInTheDocument();
  });
});
