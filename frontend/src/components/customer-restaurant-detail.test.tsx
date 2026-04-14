import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { CustomerRestaurantDetail } from "@/components/customer-restaurant-detail";
import { getRestaurant, getRestaurantMenu } from "@/lib/api";
import { readSession } from "@/lib/session";
import { MenuItem, Restaurant } from "@/types";


vi.mock("@/lib/api", () => ({
  getRestaurant: vi.fn(),
  getRestaurantMenu: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  SESSION_EVENT: "food-delivery-session-changed",
  readSession: vi.fn(),
}));

vi.mock("@/components/customer-session", () => ({
  CustomerSession: ({ title }: { title: string }) => createElement("div", null, title),
}));

vi.mock("@/components/menu-list", () => ({
  MenuList: ({ items }: { items: MenuItem[] }) =>
    createElement("div", null, items.map((item) => createElement("span", { key: item.id }, item.name))),
}));


const mockedGetRestaurant = vi.mocked(getRestaurant);
const mockedGetRestaurantMenu = vi.mocked(getRestaurantMenu);
const mockedReadSession = vi.mocked(readSession);

const restaurant: Restaurant = {
  id: 1,
  name: "Rice House",
  description: "Comfort bowls",
  status: "active",
  owner_user_id: 11,
};

const menu: MenuItem[] = [
  { id: 1, restaurant_id: 1, name: "Beef Rice", description: "Braised beef", price: 28.5, is_available: true },
];

describe("CustomerRestaurantDetail", () => {
  beforeEach(() => {
    mockedReadSession.mockReturnValue({
      token: "customer-token",
      user: { id: 1, role: "customer", name: "Alice", email: "alice@example.com" },
    });
    mockedGetRestaurant.mockResolvedValue(restaurant);
    mockedGetRestaurantMenu.mockResolvedValue(menu);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads restaurant detail and menu for a customer", async () => {
    render(createElement(CustomerRestaurantDetail, { restaurantId: 1 }));

    expect(await screen.findByText("Rice House")).toBeInTheDocument();
    expect(screen.getByText("Beef Rice")).toBeInTheDocument();
  });

  it("refreshes detail data on demand", async () => {
    render(createElement(CustomerRestaurantDetail, { restaurantId: 1 }));

    await screen.findByText("Rice House");
    expect(mockedGetRestaurant).toHaveBeenCalledTimes(1);
    expect(mockedGetRestaurantMenu).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "刷新详情" }));

    await waitFor(() => {
      expect(mockedGetRestaurant).toHaveBeenCalledTimes(2);
      expect(mockedGetRestaurantMenu).toHaveBeenCalledTimes(2);
    });
  });

  it("shows the not-found state and translated error message on load failure", async () => {
    mockedGetRestaurant.mockRejectedValueOnce(new Error("Restaurant not found"));
    mockedGetRestaurantMenu.mockRejectedValueOnce(new Error("Restaurant not found"));

    render(createElement(CustomerRestaurantDetail, { restaurantId: 404 }));

    expect(await screen.findByText("没有找到这家餐厅，或你当前无权查看。")).toBeInTheDocument();
    expect(screen.getByText("餐厅不存在。")).toBeInTheDocument();
  });
});
