# 数据库 Schema

## 核心表
- users
- restaurants
- menu_items
- carts
- cart_items
- orders
- order_items

## users
- id
- role
- name
- email
- password_hash
- created_at

## restaurants
- id
- name
- description
- status
- created_at

## menu_items
- id
- restaurant_id
- name
- description
- price
- is_available

## carts
- id
- user_id
- created_at

## cart_items
- id
- cart_id
- menu_item_id
- quantity

## orders
- id
- user_id
- restaurant_id
- status
- total_amount
- created_at

## order_items
- id
- order_id
- menu_item_id
- quantity
- unit_price
