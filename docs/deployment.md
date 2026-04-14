# 部署与初始化

## 本地依赖
- PostgreSQL 15+
- Python 3.12+
- Node.js 20+

## 数据库
推荐为本项目创建独立数据库：

```bash
createdb food_delivery_mvp
```

后端环境文件 `backend/.env` 示例：

```env
DATABASE_URL=postgresql+psycopg://postgres:121212@localhost:5432/food_delivery_mvp
JWT_SECRET_KEY=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

## 后端启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## 演示数据

```bash
cd backend
.venv/bin/python -m app.scripts.seed
```

默认账号：
- 顾客：`customer@example.com / secret123`
- 商家：`merchant@example.com / secret123`
- 管理员：`admin@example.com / secret123`

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

## 仓库级验证

在仓库根目录可直接执行：

```bash
make verify
```

该命令会顺序执行：
- 后端测试
- 前端单元测试
- 前端生产构建

CI 也会执行同一组核心验证：
- 后端：`pytest -q`
- 前端：`npm run test:run`
- 前端：`npm run build`

默认访问：
- 前端：`http://localhost:3000`
- 后端：`http://localhost:8000`
