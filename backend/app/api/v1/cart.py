from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.deps.auth import get_current_user
from app.models.cart import CartItem
from app.models.user import User
from app.schemas.cart import CartItemMutation, CartItemUpdate, CartResponse
from app.services.cart_service import (
    ensure_item_sellable,
    ensure_single_restaurant,
    load_cart_with_items,
    serialize_cart,
)


router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartResponse:
    cart = load_cart_with_items(db, current_user.id)
    return serialize_cart(cart)


@router.post("/items", response_model=CartResponse)
def add_cart_item(
    payload: CartItemMutation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartResponse:
    cart = load_cart_with_items(db, current_user.id)
    menu_item = ensure_item_sellable(db, payload.menu_item_id)
    ensure_single_restaurant(cart, menu_item)

    cart_item = db.scalar(
        select(CartItem).where(CartItem.cart_id == cart.id, CartItem.menu_item_id == payload.menu_item_id)
    )
    if cart_item:
        cart_item.quantity += payload.quantity
    else:
        db.add(CartItem(cart_id=cart.id, menu_item_id=payload.menu_item_id, quantity=payload.quantity))

    db.commit()
    cart = load_cart_with_items(db, current_user.id)
    return serialize_cart(cart)


@router.patch("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartResponse:
    cart = load_cart_with_items(db, current_user.id)
    cart_item = db.scalar(select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id))
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    cart_item.quantity = payload.quantity
    db.commit()
    cart = load_cart_with_items(db, current_user.id)
    return serialize_cart(cart)


@router.delete("/items/{item_id}", response_model=CartResponse)
def delete_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartResponse:
    cart = load_cart_with_items(db, current_user.id)
    cart_item = db.scalar(select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id))
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    db.delete(cart_item)
    db.commit()
    cart = load_cart_with_items(db, current_user.id)
    return serialize_cart(cart)

