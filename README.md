# Food Delivery App MVP

MVP 外卖平台仓库，按前后端分离方式组织：
- `frontend/`：Next.js 顾客侧 Web
- `backend/`：FastAPI API 服务
- `docs/`：产品、架构、API、数据库与测试文档

## 项目结构设计

```text
food-delivery-app/
├── frontend/   # 顾客端界面
├── backend/    # API、业务逻辑、数据模型
└── docs/       # 范围、架构、接口、测试说明
```

后端继续保持模块化分层：
- `app/api`：路由入口
- `app/services`：业务流程
- `app/schemas`：请求与响应结构
- `app/models`：数据库模型

## MVP 与非 MVP

MVP 功能：
- 顾客注册/登录
- 餐厅列表、详情、菜单浏览
- 购物车增删改查
- 创建订单与查看订单列表
- 商家菜单管理与订单状态更新 API
- 管理员基础查询 API

非 MVP 功能：
- 支付集成
- 配送追踪
- 推荐系统
- 多城市调度
- 完整商家后台和管理员后台界面

## 运行方式

后端：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

本地 PostgreSQL 已按独立库方式接入：
- 数据库名：`food_delivery_mvp`
- 后端环境文件：`backend/.env`
- 连接串格式：`postgresql+psycopg://<user>:<password>@localhost:5432/food_delivery_mvp`

前端：

```bash
cd frontend
npm install
npm run dev
```

默认前端访问 `http://localhost:3000`，默认后端访问 `http://localhost:8000`。
更完整的初始化与启动步骤见 `docs/deployment.md`。

## 当前阶段

已完成：
- FastAPI 顾客、商家、管理员基础 API
- Next.js 顾客、商家、管理员三个角色的 MVP 页面
- 顾客注册/登录、加购、购物车管理、下单、订单历史
- 商家注册/登录、创建餐厅、菜单管理、订单状态更新
- 管理员注册/登录、查看全平台餐厅与订单
- 补充核心权限边界测试：角色访问限制、商家资源归属、空购物车下单、订单隔离
- 收紧商家订单状态流转规则，并在商家端界面只展示合法下一状态
- 统一顾客侧餐厅可见性：停业餐厅不会出现在详情与菜单接口中
- 收紧商家输入校验，拒绝空白名称和非法价格
- 防止商家删除已被购物车或订单引用的菜品，避免破坏历史数据
- 统一认证邮箱归一化，避免大小写变体导致重复账号和登录不一致
- 补齐顾客端与管理端真实刷新动作，并让菜单页支持“仅看可下单”过滤
- 下单时重新校验购物车商品可售状态，阻止顾客结算已下架商品
- 补齐商家端真实刷新动作，并让“创建菜品”按钮直接定位到编辑表单
- 修正顾客餐厅详情页切换与失败场景，避免残留上一家餐厅数据，并补充刷新动作
- 统一顾客组件 session 过滤，避免商家或管理员 token 误触发顾客接口请求
- 将顾客餐厅搜索和管理端餐厅/订单筛选从占位交互补成可用功能
- 将商家端菜单检索和订单状态筛选从占位交互补成可用功能
- 接入前端 Vitest 基线，并补充订单状态与错误文案映射的自动化测试
- 升级前端 Next.js 到安全修复版本，并补齐 GitHub Actions CI 与仓库级 `make verify`
- 补充顾客餐厅搜索与管理端筛选的前端交互测试，覆盖刷新与过滤行为
- 补充商家端菜单检索、订单筛选、刷新与表单定位的前端交互测试
- 补充购物车页数量调整、删除商品与提交订单刷新的前端交互测试
- 补充顾客餐厅详情刷新、错误态以及菜单“仅看可下单”的前端交互测试
- 补充共享登录组件的前端交互测试，覆盖注册、角色校验登录和退出登录
- 补充后端异常与回归测试：非法 token、资源不存在、输入校验、重复加购、空购物车结构与订单无副作用更新

待继续：
- 端到端联调测试或浏览器级回归测试

## 基本验证

后端：

```bash
cd backend
pytest
```

PostgreSQL 表检查：

```bash
PGPASSWORD=你的密码 psql -h localhost -U 你的用户 -d food_delivery_mvp -c '\dt'
```

填充演示数据：

```bash
cd backend
.venv/bin/python -m app.scripts.seed
```

重置本地开发库：

```bash
cd backend
.venv/bin/python -m app.scripts.reset_db
.venv/bin/python -m app.scripts.seed
```

默认演示账号：
- 顾客：`customer@example.com / secret123`
- 商家：`merchant@example.com / secret123`
- 管理员：`admin@example.com / secret123`

前端：

```bash
cd frontend
npm run build
npm run test:run
```

仓库级统一验证：

```bash
make verify
```
