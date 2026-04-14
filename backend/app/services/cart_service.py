from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.cart import Cart, CartItem
from app.models.menu_item import MenuItem
from app.schemas.cart import CartResponse


def get_or_create_cart(db: Session, user_id: int) -> Cart:
    cart = db.scalar(select(Cart).where(Cart.user_id == user_id).options(selectinload(Cart.items)))
    if cart:
        return cart

    cart = Cart(user_id=user_id)
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def serialize_cart(cart: Cart) -> CartResponse:
    items = []
    total = Decimal("0")
    restaurant_id = None

    for item in cart.items:
        price = Decimal(str(item.menu_item.price))
        line_total = price * item.quantity
        total += line_total
        restaurant_id = item.menu_item.restaurant_id
        items.append(
            {
                "id": item.id,
                "menu_item_id": item.menu_item_id,
                "menu_item_name": item.menu_item.name,
                "quantity": item.quantity,
                "unit_price": float(price),
                "line_total": float(line_total),
            }
        )

    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        restaurant_id=restaurant_id,
        items=items,
        total_amount=float(total),
    )


def load_cart_with_items(db: Session, user_id: int) -> Cart:
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.items).selectinload(CartItem.menu_item))
    )
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
        cart = db.scalar(
            select(Cart)
            .where(Cart.user_id == user_id)
            .options(selectinload(Cart.items).selectinload(CartItem.menu_item))
        )
    return cart


def ensure_item_sellable(db: Session, menu_item_id: int) -> MenuItem:
    menu_item = db.scalar(select(MenuItem).where(MenuItem.id == menu_item_id))
    if not menu_item or not menu_item.is_available:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item unavailable")
    return menu_item


def ensure_single_restaurant(cart: Cart, menu_item: MenuItem) -> None:
    if cart.items and any(item.menu_item.restaurant_id != menu_item.restaurant_id for item in cart.items):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart can only contain items from one restaurant",
        )

