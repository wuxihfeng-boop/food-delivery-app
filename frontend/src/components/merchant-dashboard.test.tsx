import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { MerchantDashboard } from "@/components/merchant-dashboard";
import {
  getMerchantMenuItems,
  getMerchantOrders,
  getMerchantRestaurants,
} from "@/lib/api";
import { readSession } from "@/lib/session";
import { MenuItem, Order, Restaurant } from "@/types";


vi.mock("@/lib/api", () => ({
  createMerchantMenuItem: vi.fn(),
  createMerchantRestaurant: vi.fn(),
  deleteMerchantMenuItem: vi.fn(),
  getMerchantMenuItems: vi.fn(),
  getMerchantOrders: vi.fn(),
  getMerchantRestaurants: vi.fn(),
  updateMerchantMenuItem: vi.fn(),
  updateMerchantOrderStatus: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  SESSION_EVENT: "food-delivery-session-changed",
  readSession: vi.fn(),
}));

vi.mock("@/components/role-session", () => ({
  RoleSession: ({ title }: { title: string }) => createElement("div", null, title),
}));


const mockedGetMerchantRestaurants = vi.mocked(getMerchantRestaurants);
const mockedGetMerchantMenuItems = vi.mocked(getMerchantMenuItems);
const mockedGetMerchantOrders = vi.mocked(getMerchantOrders);
const mockedReadSession = vi.mocked(readSession);

const restaurants: Restaurant[] = [
  { id: 1, name: "Rice House", description: "Comfort bowls", status: "active", owner_user_id: 11 },
  { id: 2, name: "Noodle Corner", description: "Hand-pulled noodles", status: "active", owner_user_id: 11 },
];

const menuItems: MenuItem[] = [
  { id: 101, restaurant_id: 1, name: "Beef Rice", description: "Braised beef", price: 28.5, is_available: true },
  { id: 202, restaurant_id: 2, name: "Spicy Noodles", description: "Chili oil", price: 22, is_available: false },
];

const orders: Order[] = [
  {
    id: 31,
    restaurant_id: 1,
    status: "pending",
    total_amount: 28.5,
    created_at: "2026-04-14T10:00:00Z",
    items: [{ id: 1, menu_item_id: 101, menu_item_name: "Beef Rice", quantity: 1, unit_price: 28.5 }],
  },
  {
    id: 32,
    restaurant_id: 2,
    status: "completed",
    total_amount: 44,
    created_at: "2026-04-14T11:00:00Z",
    items: [{ id: 2, menu_item_id: 202, menu_item_name: "Spicy Noodles", quantity: 2, unit_price: 22 }],
  },
];

describe("MerchantDashboard", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    mockedReadSession.mockReturnValue({
      token: "merchant-token",
      user: { id: 11, role: "merchant", name: "Merchant", email: "merchant@example.com" },
    });
    mockedGetMerchantRestaurants.mockResolvedValue(restaurants);
    mockedGetMerchantMenuItems.mockResolvedValue(menuItems);
    mockedGetMerchantOrders.mockResolvedValue(orders);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters menu items by search text", async () => {
    render(createElement(MerchantDashboard));

    expect(await screen.findByText("Beef Rice")).toBeInTheDocument();
    expect(screen.getByText("Spicy Noodles")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("搜索菜品、描述、餐厅名称或 ID"), "noodle");

    expect(screen.queryByText("Beef Rice")).not.toBeInTheDocument();
    expect(screen.getByText("Spicy Noodles")).toBeInTheDocument();
    expect(screen.getByText("命中 1 个菜品")).toBeInTheDocument();
  });

  it("filters orders by status", async () => {
    render(createElement(MerchantDashboard));

    expect(await screen.findByText("订单 #31")).toBeInTheDocument();
    expect(screen.getByText("订单 #32")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[1], "completed");

    expect(screen.queryByText("订单 #31")).not.toBeInTheDocument();
    expect(screen.getByText("订单 #32")).toBeInTheDocument();
    expect(screen.getByText("订单 1 笔")).toBeInTheDocument();
  });

  it("refreshes merchant data on demand", async () => {
    render(createElement(MerchantDashboard));

    await screen.findByText("Beef Rice");
    expect(mockedGetMerchantRestaurants).toHaveBeenCalledTimes(1);
    expect(mockedGetMerchantMenuItems).toHaveBeenCalledTimes(1);
    expect(mockedGetMerchantOrders).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "刷新数据" }));

    await waitFor(() => {
      expect(mockedGetMerchantRestaurants).toHaveBeenCalledTimes(2);
      expect(mockedGetMerchantMenuItems).toHaveBeenCalledTimes(2);
      expect(mockedGetMerchantOrders).toHaveBeenCalledTimes(2);
    });
  });

  it("moves focus to the menu form when create menu item is clicked", async () => {
    render(createElement(MerchantDashboard));

    await screen.findByText("Beef Rice");
    await userEvent.click(screen.getByRole("button", { name: "创建菜品" }));

    await waitFor(() => {
      expect(screen.getAllByRole("combobox")[0]).toHaveFocus();
    });
  });
});
