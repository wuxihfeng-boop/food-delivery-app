"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


const navItems = [
  { href: "/", label: "仪表盘" },
  { href: "/restaurants", label: "顾客端" },
  { href: "/cart", label: "购物车与订单" },
  { href: "/merchant", label: "商家端" },
  { href: "/admin", label: "管理端" },
];

export function EditorialNav() {
  const pathname = usePathname();

  return (
    <nav className="editorialNav">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "navItem navItemActive" : "navItem"}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
