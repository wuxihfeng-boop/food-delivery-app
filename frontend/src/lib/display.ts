import { Order, Restaurant, UserRole } from "@/types";

const nextOrderStatusMap: Record<Order["status"], Order["status"][]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["completed"],
  completed: [],
  cancelled: [],
};

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "customer":
      return "顾客";
    case "merchant":
      return "商家";
    case "admin":
      return "管理员";
  }
}

export function getRestaurantStatusLabel(status: Restaurant["status"]): string {
  switch (status) {
    case "active":
      return "营业中";
    case "inactive":
      return "已停业";
  }
}

export function getOrderStatusLabel(status: Order["status"]): string {
  switch (status) {
    case "pending":
      return "待处理";
    case "confirmed":
      return "已确认";
    case "preparing":
      return "制作中";
    case "completed":
      return "已完成";
    case "cancelled":
      return "已取消";
  }
}

export function getAllowedMerchantOrderStatuses(status: Order["status"]): Order["status"][] {
  return [status, ...nextOrderStatusMap[status]];
}

export function translateErrorMessage(message: string): string {
  if (message.includes("Email already registered")) return "该邮箱已被注册。";
  if (message.includes("Invalid email or password")) return "邮箱或密码错误。";
  if (message.includes("Authentication required")) return "请先登录。";
  if (message.includes("Invalid token")) return "登录状态已失效，请重新登录。";
  if (message.includes("User not found")) return "用户不存在。";
  if (message.includes("Forbidden")) return "你没有权限执行此操作。";
  if (message.includes("Restaurant not found")) return "餐厅不存在。";
  if (message.includes("Menu item not found")) return "菜品不存在。";
  if (message.includes("Menu item cannot be deleted after being added to carts or orders")) {
    return "该菜品已经关联购物车或订单，当前不能删除。";
  }
  if (message.includes("Menu item unavailable")) return "该菜品当前不可售。";
  if (message.includes("Cart item not found")) return "购物车商品不存在。";
  if (message.includes("Cart is empty")) return "购物车为空。";
  if (message.includes("Cart contains unavailable menu items")) return "购物车中包含已下架或不可售商品，请先调整后再下单。";
  if (message.includes("Mixed restaurant cart is invalid")) return "购物车中的商品餐厅不一致。";
  if (message.includes("Cart can only contain items from one restaurant")) return "购物车只能包含同一家餐厅的商品。";
  if (message.includes("Order not found")) return "订单不存在。";
  if (message.includes("Invalid order status transition")) return "当前订单状态不允许这样流转。";
  if (message.includes("Unable to load")) return "加载数据失败。";
  if (message.includes("failed")) return "操作失败，请稍后重试。";
  return message;
}
