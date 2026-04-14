import type { Metadata } from "next";
import Link from "next/link";

import { EditorialNav } from "@/components/editorial-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "外卖平台 MVP",
  description: "基于 Next.js 和 FastAPI 构建的外卖平台 MVP。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="appChrome">
          <div className="bgGlow bgGlowLeft" />
          <div className="bgGlow bgGlowRight" />
          <div className="siteFrame">
            <header className="siteHeader editorialHeader">
              <div className="editorialMasthead">
                <Link href="/" className="brand editorialBrand">
                  <span className="brandMark" aria-hidden="true">
                    <span />
                  </span>
                  <span className="brandCopy">
                    <strong>食速达</strong>
                    <small>Food Delivery Platform</small>
                  </span>
                </Link>
                <div className="editorialHeaderMeta">
                  <span className="versionBadge">v0.1.0 MVP</span>
                  <span className="headerChip">Product Preview</span>
                  <span className="headerChip highlightChip">在线</span>
                </div>
              </div>

              <div className="editorialTopbar">
                <div className="editorialTopbarCopy">
                  <p className="topbarLabel">Food Delivery Platform</p>
                  <h1 className="topbarTitle">一个更克制、更清晰的业务界面。</h1>
                </div>
                <div className="editorialTicketStrip">
                  <span>顾客浏览与下单</span>
                  <span>商家菜单与订单</span>
                  <span>管理员平台总览</span>
                </div>
              </div>

              <EditorialNav />
            </header>

            <main className="pageContent">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
