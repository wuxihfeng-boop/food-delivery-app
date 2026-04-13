# API 设计

## 顾客端 API
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/restaurants
- GET /api/v1/restaurants/{restaurant_id}
- GET /api/v1/restaurants/{restaurant_id}/menu
- GET /api/v1/cart
- POST /api/v1/cart/items
- PATCH /api/v1/cart/items/{item_id}
- DELETE /api/v1/cart/items/{item_id}
- POST /api/v1/orders
- GET /api/v1/orders
- GET /api/v1/orders/{order_id}

## 商家端 API
- GET /api/v1/merchant/menu-items
- POST /api/v1/merchant/menu-items
- PATCH /api/v1/merchant/menu-items/{item_id}
- DELETE /api/v1/merchant/menu-items/{item_id}
- GET /api/v1/merchant/orders
- PATCH /api/v1/merchant/orders/{order_id}/status

## 管理端 API
- GET /api/v1/admin/restaurants
- GET /api/v1/admin/orders
