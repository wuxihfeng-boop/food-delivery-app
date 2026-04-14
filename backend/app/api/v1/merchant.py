from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.deps.auth import require_roles
from app.models.cart import CartItem
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.order import MerchantOrderStatusUpdate, OrderResponse
from app.schemas.restaurant import (
    MenuItemResponse,
    MerchantMenuItemCreate,
    MerchantMenuItemUpdate,
    MerchantRestaurantCreate,
    RestaurantResponse,
)
from app.services.order_service import serialize_order, validate_order_status_transition


router = APIRouter(prefix="/merchant", tags=["merchant"])


def ensure_restaurant_owner(db: Session, restaurant_id: int, merchant_id: int) -> Restaurant:
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    if restaurant.owner_user_id != merchant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return restaurant


@router.get("/restaurants", response_model=list[RestaurantResponse])
def list_merchant_restaurants(
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> list[Restaurant]:
    return list(
        db.scalars(select(Restaurant).where(Restaurant.owner_user_id == current_user.id).order_by(Restaurant.id.asc()))
    )


@router.post("/restaurants", response_model=RestaurantResponse)
def create_merchant_restaurant(
    payload: MerchantRestaurantCreate,
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> Restaurant:
    restaurant = Restaurant(owner_user_id=current_user.id, name=payload.name, description=payload.description)
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant


@router.get("/menu-items", response_model=list[MenuItemResponse])
def list_merchant_menu_items(
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> list[MenuItem]:
    return list(
        db.scalars(
            select(MenuItem)
            .join(Restaurant, Restaurant.id == MenuItem.restaurant_id)
            .where(Restaurant.owner_user_id == current_user.id)
            .order_by(MenuItem.id.asc())
        )
    )


@router.post("/menu-items", response_model=MenuItemResponse)
def create_merchant_menu_item(
    payload: MerchantMenuItemCreate,
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> MenuItem:
    ensure_restaurant_owner(db, payload.restaurant_id, current_user.id)
    item = MenuItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/menu-items/{item_id}", response_model=MenuItemResponse)
def update_merchant_menu_item(
    item_id: int,
    payload: MerchantMenuItemUpdate,
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> MenuItem:
    item = db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    ensure_restaurant_owner(db, item.restaurant_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_merchant_menu_item(
    item_id: int,
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> None:
    item = db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    ensure_restaurant_owner(db, item.restaurant_id, current_user.id)
    has_cart_references = db.scalar(select(CartItem.id).where(CartItem.menu_item_id == item_id).limit(1))
    has_order_references = db.scalar(select(OrderItem.id).where(OrderItem.menu_item_id == item_id).limit(1))
    if has_cart_references or has_order_references:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Menu item cannot be deleted after being added to carts or orders",
        )
    db.delete(item)
    db.commit()


@router.get("/orders", response_model=list[OrderResponse])
def list_merchant_orders(
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> list[OrderResponse]:
    orders = list(
        db.scalars(
            select(Order)
            .join(Restaurant, Restaurant.id == Order.restaurant_id)
            .where(Restaurant.owner_user_id == current_user.id)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .order_by(Order.created_at.desc())
        )
    )
    return [serialize_order(order) for order in orders]


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
def update_merchant_order_status(
    order_id: int,
    payload: MerchantOrderStatusUpdate,
    current_user: User = Depends(require_roles(UserRole.MERCHANT)),
    db: Session = Depends(get_db),
) -> OrderResponse:
    order = db.scalar(
        select(Order)
        .join(Restaurant, Restaurant.id == Order.restaurant_id)
        .where(Order.id == order_id, Restaurant.owner_user_id == current_user.id)
        .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    validate_order_status_transition(order.status, payload.status)
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return serialize_order(order)
