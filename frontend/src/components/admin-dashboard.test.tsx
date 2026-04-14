import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminOrders, getAdminRestaurants } from "@/lib/api";
import { readSession } from "@/lib/session";
import { Order, Restaurant } from "@/types";


vi.mock("@/lib/api", () => ({
  getAdminOrders: vi.fn(),
  getAdminRestaurants: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  SESSION_EVENT: "food-delivery-session-changed",
  readSession: vi.fn(),
}));

vi.mock("@/components/role-session", () => ({
  RoleSession: ({ title }: { title: string }) => createElement("div", null, title),
}));


const mockedGetAdminRestaurants = vi.mocked(getAdminRestaurants);
const mockedGetAdminOrders = vi.mocked(getAdminOrders);
const mockedReadSession = vi.mocked(readSession);

const restaurants: Restaurant[] = [
  { id: 1, name: "Rice House", description: "Comfort food", status: "active", owner_user_id: 11 },
  { id: 2, name: "Burger Lab", description: "Grilled specials", status: "inactive", owner_user_id: 18 },
];

const orders: Order[] = [
  {
    id: 21,
    restaurant_id: 1,
    status: "pending",
    total_amount: 36,
    created_at: "2026-04-14T10:00:00Z",
    items: [{ id: 1, menu_item_id: 101, menu_item_name: "Beef Rice", quantity: 1, unit_price: 36 }],
  },
  {
    id: 22,
    restaurant_id: 2,
    status: "completed",
    total_amount: 58,
    created_at: "2026-04-14T11:00:00Z",
    items: [{ id: 2, menu_item_id: 202, menu_item_name: "Double Burger", quantity: 2, unit_price: 29 }],
  },
];

describe("AdminDashboard", () => {
  beforeEach(() => {
    mockedReadSession.mockReturnValue({
      token: "admin-token",
      user: { id: 1, role: "admin", name: "Admin", email: "admin@example.com" },
    });
    mockedGetAdminRestaurants.mockResolvedValue(restaurants);
    mockedGetAdminOrders.mockResolvedValue(orders);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters restaurants by search text", async () => {
    render(createElement(AdminDashboard));

    expect(await screen.findByText("Rice House")).toBeInTheDocument();
    expect(screen.getByText("Burger Lab")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("搜索餐厅、描述、餐厅 ID 或商家用户 ID"), "burger");

    expect(screen.queryByText("Rice House")).not.toBeInTheDocument();
    expect(screen.getByText("Burger Lab")).toBeInTheDocument();
    expect(screen.getByText("命中 1 家")).toBeInTheDocument();
  });

  it("filters orders by status", async () => {
    render(createElement(AdminDashboard));

    expect(await screen.findByText("订单 #21")).toBeInTheDocument();
    expect(screen.getByText("订单 #22")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox"), "completed");

    expect(screen.queryByText("订单 #21")).not.toBeInTheDocument();
    expect(screen.getByText("订单 #22")).toBeInTheDocument();
    expect(screen.getByText("订单 1 笔")).toBeInTheDocument();
  });

  it("refreshes admin data on demand", async () => {
    render(createElement(AdminDashboard));

    await screen.findByText("Rice House");
    expect(mockedGetAdminRestaurants).toHaveBeenCalledTimes(1);
    expect(mockedGetAdminOrders).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "刷新数据" }));

    await waitFor(() => {
      expect(mockedGetAdminRestaurants).toHaveBeenCalledTimes(2);
      expect(mockedGetAdminOrders).toHaveBeenCalledTimes(2);
    });
  });
});
