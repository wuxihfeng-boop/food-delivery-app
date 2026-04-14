from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.deps.auth import get_current_user
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.user import User
from app.schemas.restaurant import MenuItemResponse, RestaurantResponse


router = APIRouter(prefix="/restaurants", tags=["restaurants"])


def get_active_restaurant_or_404(db: Session, restaurant_id: int) -> Restaurant:
    restaurant = db.scalar(
        select(Restaurant).where(Restaurant.id == restaurant_id, Restaurant.status == RestaurantStatus.ACTIVE)
    )
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    return restaurant


@router.get("", response_model=list[RestaurantResponse])
def list_restaurants(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Restaurant]:
    return list(db.scalars(select(Restaurant).where(Restaurant.status == RestaurantStatus.ACTIVE)))


@router.get("/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(
    restaurant_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Restaurant:
    return get_active_restaurant_or_404(db, restaurant_id)


@router.get("/{restaurant_id}/menu", response_model=list[MenuItemResponse])
def get_restaurant_menu(
    restaurant_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MenuItem]:
    get_active_restaurant_or_404(db, restaurant_id)
    return list(
        db.scalars(select(MenuItem).where(MenuItem.restaurant_id == restaurant_id).order_by(MenuItem.id.asc()))
    )
