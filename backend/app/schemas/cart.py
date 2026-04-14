from pydantic import BaseModel, Field


class CartItemMutation(BaseModel):
    menu_item_id: int
    quantity: int = Field(ge=1, le=99)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartItemResponse(BaseModel):
    id: int
    menu_item_id: int
    menu_item_name: str
    quantity: int
    unit_price: float
    line_total: float


class CartResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int | None
    items: list[CartItemResponse]
    total_amount: float

