export type Restaurant = {
  id: number;
  owner_user_id?: number | null;
  name: string;
  description: string;
  status: "active" | "inactive";
};

export type UserRole = "customer" | "merchant" | "admin";

export type User = {
  id: number;
  role: UserRole;
  name: string;
  email: string;
};

export type MenuItem = {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
};

export type CartItem = {
  id: number;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Cart = {
  id: number;
  user_id: number;
  restaurant_id: number | null;
  items: CartItem[];
  total_amount: number;
};

export type OrderItem = {
  id: number;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
};

export type Order = {
  id: number;
  restaurant_id: number;
  status: "pending" | "confirmed" | "preparing" | "completed" | "cancelled";
  total_amount: number;
  created_at: string;
  items: OrderItem[];
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};
