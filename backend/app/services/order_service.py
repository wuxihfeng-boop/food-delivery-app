from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus
from app.schemas.order import OrderResponse


ALLOWED_ORDER_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.COMPLETED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
}


def load_user_orders(db: Session, user_id: int) -> list[Order]:
    return list(
        db.scalars(
            select(Order)
            .where(Order.user_id == user_id)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .order_by(Order.created_at.desc())
        )
    )


def serialize_order(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        restaurant_id=order.restaurant_id,
        status=order.status,
        total_amount=float(order.total_amount),
        created_at=order.created_at,
        items=[
            {
                "id": item.id,
                "menu_item_id": item.menu_item_id,
                "menu_item_name": item.menu_item.name,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
            }
            for item in order.items
        ],
    )


def validate_order_status_transition(current_status: OrderStatus, next_status: OrderStatus) -> None:
    if current_status == next_status:
        return

    if next_status not in ALLOWED_ORDER_STATUS_TRANSITIONS[current_status]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid order status transition: {current_status} -> {next_status}",
        )


def create_order_from_cart(db: Session, user_id: int) -> Order:
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.items).selectinload(CartItem.menu_item))
    )
    if not cart or not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    restaurant_id = cart.items[0].menu_item.restaurant_id
    total = Decimal("0")
    order = Order(user_id=user_id, restaurant_id=restaurant_id, total_amount=0)
    db.add(order)
    db.flush()

    for item in cart.items:
        if item.menu_item.restaurant_id != restaurant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mixed restaurant cart is invalid")
        if not item.menu_item.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart contains unavailable menu items",
            )
        price = Decimal(str(item.menu_item.price))
        total += price * item.quantity
        db.add(
            OrderItem(
                order_id=order.id,
                menu_item_id=item.menu_item_id,
                quantity=item.quantity,
                unit_price=price,
            )
        )

    order.total_amount = total
    for item in list(cart.items):
        db.delete(item)

    db.commit()
    db.refresh(order)
    return db.scalar(
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
    )
