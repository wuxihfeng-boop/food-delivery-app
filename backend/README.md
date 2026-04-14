# Backend

FastAPI API service for the food delivery MVP.

## Current MVP scope

- Auth APIs for customer, merchant, and admin roles
- Customer APIs for restaurants, menus, carts, and orders
- Merchant APIs for owned restaurants, menu items, and order status updates
- Admin APIs for restaurant and order overview

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## PostgreSQL

Recommended local setup for this repo:

```bash
createdb food_delivery_mvp
```

Set `backend/.env` with a dedicated database URL, for example:

```env
DATABASE_URL=postgresql+psycopg://postgres:121212@localhost:5432/food_delivery_mvp
JWT_SECRET_KEY=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

## Seed

Populate local demo data:

```bash
.venv/bin/python -m app.scripts.seed
```

Reset the local development database and rebuild schema from Alembic:

```bash
.venv/bin/python -m app.scripts.reset_db
```

Default demo accounts:
- `customer@example.com / secret123`
- `merchant@example.com / secret123`
- `admin@example.com / secret123`

## Test

```bash
pytest
```
