from datetime import datetime

from pydantic import BaseModel

from app.models.order import OrderStatus


class CreateOrderRequest(BaseModel):
    pass


class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: int
    menu_item_name: str
    quantity: int
    unit_price: float


class OrderResponse(BaseModel):
    id: int
    restaurant_id: int
    status: OrderStatus
    total_amount: float
    created_at: datetime
    items: list[OrderItemResponse]


class MerchantOrderStatusUpdate(BaseModel):
    status: OrderStatus

