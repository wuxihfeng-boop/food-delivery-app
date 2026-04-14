import { AuthResponse, Cart, MenuItem, Order, Restaurant, UserRole } from "@/types";

const API_BASE_URL = process.env.FRONTEND_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getRestaurants(token: string): Promise<Restaurant[]> {
  return apiFetch<Restaurant[]>("/api/v1/restaurants", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getRestaurant(id: number, token: string): Promise<Restaurant> {
  return apiFetch<Restaurant>(`/api/v1/restaurants/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getRestaurantMenu(id: number, token: string): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>(`/api/v1/restaurants/${id}/menu`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getCart(token?: string): Promise<Cart> {
  return apiFetch<Cart>("/api/v1/cart", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function registerUser(payload: {
  role: UserRole;
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerCustomer(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
  return registerUser({ ...payload, role: "customer" });
}

export function loginCustomer(payload: { email: string; password: string }): Promise<AuthResponse> {
  return loginUser(payload);
}

export function addCartItem(
  token: string,
  payload: { menu_item_id: number; quantity: number },
): Promise<Cart> {
  return apiFetch<Cart>("/api/v1/cart/items", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function updateCartItem(
  token: string,
  itemId: number,
  payload: { quantity: number },
): Promise<Cart> {
  return apiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function deleteCartItem(token: string, itemId: number): Promise<Cart> {
  return apiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createOrder(token: string): Promise<Order> {
  return apiFetch<Order>("/api/v1/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export function getOrders(token: string): Promise<Order[]> {
  return apiFetch<Order[]>("/api/v1/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getMerchantRestaurants(token: string): Promise<Restaurant[]> {
  return apiFetch<Restaurant[]>("/api/v1/merchant/restaurants", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createMerchantRestaurant(
  token: string,
  payload: { name: string; description: string },
): Promise<Restaurant> {
  return apiFetch<Restaurant>("/api/v1/merchant/restaurants", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function getMerchantMenuItems(token: string): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>("/api/v1/merchant/menu-items", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createMerchantMenuItem(
  token: string,
  payload: {
    restaurant_id: number;
    name: string;
    description: string;
    price: number;
    is_available: boolean;
  },
): Promise<MenuItem> {
  return apiFetch<MenuItem>("/api/v1/merchant/menu-items", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function updateMerchantMenuItem(
  token: string,
  itemId: number,
  payload: Partial<{
    name: string;
    description: string;
    price: number;
    is_available: boolean;
  }>,
): Promise<MenuItem> {
  return apiFetch<MenuItem>(`/api/v1/merchant/menu-items/${itemId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function deleteMerchantMenuItem(token: string, itemId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/merchant/menu-items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getMerchantOrders(token: string): Promise<Order[]> {
  return apiFetch<Order[]>("/api/v1/merchant/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateMerchantOrderStatus(
  token: string,
  orderId: number,
  status: Order["status"],
): Promise<Order> {
  return apiFetch<Order>(`/api/v1/merchant/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
}

export function getAdminRestaurants(token: string): Promise<Restaurant[]> {
  return apiFetch<Restaurant[]>("/api/v1/admin/restaurants", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAdminOrders(token: string): Promise<Order[]> {
  return apiFetch<Order[]>("/api/v1/admin/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
