"""Initial schema

Revision ID: 20260413_0001
Revises: None
Create Date: 2026-04-13 22:40:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260413_0001"
down_revision = None
branch_labels = None
depends_on = None


user_role = postgresql.ENUM("CUSTOMER", "MERCHANT", "ADMIN", name="userrole", create_type=False)
restaurant_status = postgresql.ENUM("ACTIVE", "INACTIVE", name="restaurantstatus", create_type=False)
order_status = postgresql.ENUM(
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "COMPLETED",
    "CANCELLED",
    name="orderstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("CUSTOMER", "MERCHANT", "ADMIN", name="userrole").create(bind, checkfirst=True)
    postgresql.ENUM("ACTIVE", "INACTIVE", name="restaurantstatus").create(bind, checkfirst=True)
    postgresql.ENUM(
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "COMPLETED",
        "CANCELLED",
        name="orderstatus",
    ).create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role", user_role, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "restaurants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", restaurant_status, nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_restaurants_id"), "restaurants", ["id"], unique=False)

    op.create_table(
        "carts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_carts_id"), "carts", ["id"], unique=False)

    op.create_table(
        "menu_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("restaurant_id", sa.Integer(), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index(op.f("ix_menu_items_id"), "menu_items", ["id"], unique=False)
    op.create_index(op.f("ix_menu_items_restaurant_id"), "menu_items", ["restaurant_id"], unique=False)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("restaurant_id", sa.Integer(), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("status", order_status, nullable=False, server_default="PENDING"),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_orders_id"), "orders", ["id"], unique=False)
    op.create_index(op.f("ix_orders_user_id"), "orders", ["user_id"], unique=False)
    op.create_index(op.f("ix_orders_restaurant_id"), "orders", ["restaurant_id"], unique=False)

    op.create_table(
        "cart_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cart_id", sa.Integer(), sa.ForeignKey("carts.id"), nullable=False),
        sa.Column("menu_item_id", sa.Integer(), sa.ForeignKey("menu_items.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.UniqueConstraint("cart_id", "menu_item_id", name="uq_cart_menu_item"),
    )
    op.create_index(op.f("ix_cart_items_id"), "cart_items", ["id"], unique=False)
    op.create_index(op.f("ix_cart_items_cart_id"), "cart_items", ["cart_id"], unique=False)
    op.create_index(op.f("ix_cart_items_menu_item_id"), "cart_items", ["menu_item_id"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("menu_item_id", sa.Integer(), sa.ForeignKey("menu_items.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
    )
    op.create_index(op.f("ix_order_items_id"), "order_items", ["id"], unique=False)
    op.create_index(op.f("ix_order_items_order_id"), "order_items", ["order_id"], unique=False)
    op.create_index(op.f("ix_order_items_menu_item_id"), "order_items", ["menu_item_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_order_items_menu_item_id"), table_name="order_items")
    op.drop_index(op.f("ix_order_items_order_id"), table_name="order_items")
    op.drop_index(op.f("ix_order_items_id"), table_name="order_items")
    op.drop_table("order_items")

    op.drop_index(op.f("ix_cart_items_menu_item_id"), table_name="cart_items")
    op.drop_index(op.f("ix_cart_items_cart_id"), table_name="cart_items")
    op.drop_index(op.f("ix_cart_items_id"), table_name="cart_items")
    op.drop_table("cart_items")

    op.drop_index(op.f("ix_orders_restaurant_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_user_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_id"), table_name="orders")
    op.drop_table("orders")

    op.drop_index(op.f("ix_menu_items_restaurant_id"), table_name="menu_items")
    op.drop_index(op.f("ix_menu_items_id"), table_name="menu_items")
    op.drop_table("menu_items")

    op.drop_index(op.f("ix_carts_id"), table_name="carts")
    op.drop_table("carts")

    op.drop_index(op.f("ix_restaurants_id"), table_name="restaurants")
    op.drop_table("restaurants")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    postgresql.ENUM("PENDING", "CONFIRMED", "PREPARING", "COMPLETED", "CANCELLED", name="orderstatus").drop(
        bind, checkfirst=True
    )
    postgresql.ENUM("ACTIVE", "INACTIVE", name="restaurantstatus").drop(bind, checkfirst=True)
    postgresql.ENUM("CUSTOMER", "MERCHANT", "ADMIN", name="userrole").drop(bind, checkfirst=True)
