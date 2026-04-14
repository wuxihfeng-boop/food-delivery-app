from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.deps.auth import get_current_user
from app.models.order import Order, OrderItem
from app.models.user import User
from app.schemas.order import CreateOrderRequest, OrderResponse
from app.services.order_service import create_order_from_cart, load_user_orders, serialize_order


router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
def create_order(
    _: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    order = create_order_from_cart(db, current_user.id)
    return serialize_order(order)


@router.get("", response_model=list[OrderResponse])
def list_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[OrderResponse]:
    return [serialize_order(order) for order in load_user_orders(db, current_user.id)]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return serialize_order(order)

