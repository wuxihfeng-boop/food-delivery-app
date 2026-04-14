import Link from "next/link";

export default function HomePage() {
  return (
    <div className="landingMagazine">
      <section className="landingHero">
        <div className="landingHeroCopy">
          <div className="landingKickerRow">
            <span className="eyebrow">Product Overview</span>
            <span className="landingEdition">MVP Preview</span>
          </div>
          <h1 className="landingHeadline">把复杂角色流程，收进一个更安静的界面里。</h1>
          <p className="landingLead">
            这是一套为顾客、商家、管理员同时准备的外卖平台 MVP。
            重点不是堆砌信息，而是让每个角色都能在同一套品牌语言下快速找到自己的任务入口。
          </p>
          <div className="landingActions">
            <Link href="/restaurants" className="button">
              进入顾客浏览
            </Link>
            <Link href="/cart" className="button secondary">
              打开购物车与订单
            </Link>
            <Link href="/merchant" className="button secondary">
              进入商家后台
            </Link>
            <Link href="/admin" className="button secondary">
              进入管理总览
            </Link>
          </div>
        </div>

        <aside className="dispatchTicket">
          <div className="dispatchTicketTop">
            <span className="eyebrow">Current Scope</span>
            <strong>食速达 / Product Preview</strong>
          </div>
          <div className="dispatchTicketBody">
            <div className="dispatchLine">
              <span>顾客链路</span>
              <strong>浏览 / 加购 / 下单</strong>
            </div>
            <div className="dispatchLine">
              <span>商家链路</span>
              <strong>建店 / 菜单 / 订单</strong>
            </div>
            <div className="dispatchLine">
              <span>管理视图</span>
              <strong>餐厅 / 订单总览</strong>
            </div>
            <div className="dispatchLine">
              <span>当前环境</span>
              <strong>Next.js + FastAPI + PostgreSQL</strong>
            </div>
          </div>
          <div className="dispatchTicketFooter">
            <span>状态</span>
            <strong>准备演示</strong>
          </div>
        </aside>
      </section>

      <section className="landingBand">
        <article className="landingStat">
          <span className="landingStatLabel">角色入口</span>
          <strong className="landingStatValue">3</strong>
          <p className="muted">顾客、商家、管理员已全部接通</p>
        </article>
        <article className="landingStat">
          <span className="landingStatLabel">验证链路</span>
          <strong className="landingStatValue">make verify</strong>
          <p className="muted">后端测试、前端测试、前端构建统一执行</p>
        </article>
        <article className="landingStat">
          <span className="landingStatLabel">当前后端</span>
          <strong className="landingStatValue">FastAPI API</strong>
          <p className="muted">权限、状态流转、校验与异常路径已补齐</p>
        </article>
        <article className="landingStat">
          <span className="landingStatLabel">当前前端</span>
          <strong className="landingStatValue">Minimal Interface</strong>
          <p className="muted">更少噪声，更清楚的信息顺序和更稳的品牌感</p>
        </article>
      </section>

      <section className="landingGrid">
        <article className="landingFeature">
          <div className="panelHeader">
            <span className="panelDot" />
            <span>角色路径</span>
          </div>
          <h2 className="landingSectionTitle">同一个平台，三种清晰分离的工作流。</h2>
          <div className="landingRoleList">
            <div className="landingRoleCard">
              <span className="status">顾客</span>
              <h3>先看营业中的餐厅，再进入菜单和购物车。</h3>
              <p className="muted">搜索餐厅、过滤可售菜品、调整数量、提交订单、回看历史订单。</p>
            </div>
            <div className="landingRoleCard">
              <span className="status">商家</span>
              <h3>以餐厅为中心维护菜单，再沿着订单状态向后推进。</h3>
              <p className="muted">创建餐厅、发布菜品、切换可售状态、检索菜单、筛选订单。</p>
            </div>
            <div className="landingRoleCard">
              <span className="status">管理员</span>
              <h3>不直接操作业务，只读取全局面上的餐厅和订单情况。</h3>
              <p className="muted">按餐厅、描述、状态快速筛查平台数据，做演示级总览。</p>
            </div>
          </div>
        </article>

        <article className="landingFeature landingFeatureDense">
          <div className="panelHeader">
            <span className="panelDot" />
            <span>演示完成度</span>
          </div>
          <h2 className="landingSectionTitle">MVP 的关键能力已经准备好被看到。</h2>
          <div className="landingChecklist">
            <div className="landingChecklistRow">
              <span>认证与角色切换</span>
              <strong>完成</strong>
            </div>
            <div className="landingChecklistRow">
              <span>顾客浏览与下单</span>
              <strong>完成</strong>
            </div>
            <div className="landingChecklistRow">
              <span>商家菜单与订单管理</span>
              <strong>完成</strong>
            </div>
            <div className="landingChecklistRow">
              <span>管理员总览与筛选</span>
              <strong>完成</strong>
            </div>
            <div className="landingChecklistRow">
              <span>自动化验证基线</span>
              <strong>完成</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
