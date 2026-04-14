from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.deps.auth import require_roles
from app.models.order import Order, OrderItem
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.order import OrderResponse
from app.schemas.restaurant import RestaurantResponse
from app.services.order_service import serialize_order


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/restaurants", response_model=list[RestaurantResponse])
def list_admin_restaurants(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> list[Restaurant]:
    return list(db.scalars(select(Restaurant).order_by(Restaurant.id.asc())))


@router.get("/orders", response_model=list[OrderResponse])
def list_admin_orders(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> list[OrderResponse]:
    orders = list(
        db.scalars(select(Order).options(selectinload(Order.items).selectinload(OrderItem.menu_item)))
    )
    return [serialize_order(order) for order in orders]

