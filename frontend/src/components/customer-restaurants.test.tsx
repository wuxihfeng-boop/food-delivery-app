import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";

import { CustomerRestaurants } from "@/components/customer-restaurants";
import { getRestaurants } from "@/lib/api";
import { readSession } from "@/lib/session";
import { Restaurant } from "@/types";


vi.mock("@/lib/api", () => ({
  getRestaurants: vi.fn(),
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


const mockedGetRestaurants = vi.mocked(getRestaurants);
const mockedReadSession = vi.mocked(readSession);

const restaurants: Restaurant[] = [
  { id: 1, name: "Rice House", description: "Comfort bowls", status: "active", owner_user_id: 11 },
  { id: 2, name: "Noodle Corner", description: "Hand-pulled noodles", status: "active", owner_user_id: 12 },
];

describe("CustomerRestaurants", () => {
  beforeEach(() => {
    mockedReadSession.mockReturnValue({
      token: "customer-token",
      user: { id: 1, role: "customer", name: "Alice", email: "alice@example.com" },
    });
    mockedGetRestaurants.mockResolvedValue(restaurants);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters restaurants by name and description", async () => {
    render(createElement(CustomerRestaurants));

    expect(await screen.findByText("Rice House")).toBeInTheDocument();
    expect(screen.getByText("Noodle Corner")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("搜索餐厅名称或简介"), "noodle");

    expect(screen.queryByText("Rice House")).not.toBeInTheDocument();
    expect(screen.getByText("Noodle Corner")).toBeInTheDocument();
    expect(screen.getByText("营业中 1 家")).toBeInTheDocument();
  });

  it("shows an empty search result state when no restaurant matches", async () => {
    render(createElement(CustomerRestaurants));

    await screen.findByText("Rice House");
    await userEvent.type(screen.getByPlaceholderText("搜索餐厅名称或简介"), "sushi");

    expect(screen.getByText("没有匹配当前搜索条件的餐厅。")).toBeInTheDocument();
  });

  it("refreshes the restaurant list on demand", async () => {
    render(createElement(CustomerRestaurants));

    await screen.findByText("Rice House");
    expect(mockedGetRestaurants).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "刷新列表" }));

    await waitFor(() => {
      expect(mockedGetRestaurants).toHaveBeenCalledTimes(2);
    });
  });
});
