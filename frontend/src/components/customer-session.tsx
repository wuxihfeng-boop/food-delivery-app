"use client";

import { RoleSession } from "@/components/role-session";

type Props = {
  title?: string;
  description?: string;
  onSessionChange?: (session: { token: string | null; user: { role: string } | null }) => void;
};

export function CustomerSession({ title, description, onSessionChange }: Props) {
  return (
    <RoleSession
      role="customer"
      title={title ?? "顾客登录"}
      description={description ?? "登录后可以加购商品、查看购物车并提交订单。"}
      onSessionChange={onSessionChange}
    />
  );
}
