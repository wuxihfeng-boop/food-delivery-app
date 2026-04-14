from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.models.restaurant import RestaurantStatus


class RestaurantResponse(BaseModel):
    id: int
    owner_user_id: int | None
    name: str
    description: str
    status: RestaurantStatus

    model_config = {"from_attributes": True}


class MenuItemResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    description: str
    price: float
    is_available: bool

    model_config = {"from_attributes": True}


NameText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
DescriptionText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class MerchantMenuItemCreate(BaseModel):
    restaurant_id: int
    name: NameText
    description: DescriptionText = ""
    price: float = Field(gt=0, le=9999)
    is_available: bool = True


class MerchantMenuItemUpdate(BaseModel):
    name: NameText | None = None
    description: DescriptionText | None = None
    price: float | None = Field(default=None, gt=0, le=9999)
    is_available: bool | None = None


class MerchantRestaurantCreate(BaseModel):
    name: NameText
    description: DescriptionText = ""
