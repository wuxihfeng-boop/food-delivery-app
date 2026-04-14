from decimal import Decimal

from sqlalchemy import select

import app.models  # noqa: F401
from app.core.db import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.cart import Cart
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.user import User, UserRole


def get_or_create_user(session, *, role: UserRole, name: str, email: str, password: str) -> User:
    user = session.scalar(select(User).where(User.email == email))
    if user:
        user.name = name
        user.role = role
        return user

    user = User(role=role, name=name, email=email, password_hash=hash_password(password))
    session.add(user)
    session.flush()
    session.add(Cart(user_id=user.id))
    return user


def get_or_create_restaurant(session, *, owner_user_id: int, name: str, description: str) -> Restaurant:
    restaurant = session.scalar(
        select(Restaurant).where(Restaurant.owner_user_id == owner_user_id, Restaurant.name == name)
    )
    if restaurant:
        restaurant.description = description
        restaurant.status = RestaurantStatus.ACTIVE
        return restaurant

    restaurant = Restaurant(
        owner_user_id=owner_user_id,
        name=name,
        description=description,
        status=RestaurantStatus.ACTIVE,
    )
    session.add(restaurant)
    session.flush()
    return restaurant


def get_or_create_menu_item(
    session,
    *,
    restaurant_id: int,
    name: str,
    description: str,
    price: Decimal,
    is_available: bool = True,
) -> MenuItem:
    item = session.scalar(select(MenuItem).where(MenuItem.restaurant_id == restaurant_id, MenuItem.name == name))
    if item:
        item.description = description
        item.price = price
        item.is_available = is_available
        return item

    item = MenuItem(
        restaurant_id=restaurant_id,
        name=name,
        description=description,
        price=price,
        is_available=is_available,
    )
    session.add(item)
    session.flush()
    return item


def create_sample_order(
    session,
    *,
    customer_id: int,
    restaurant_id: int,
    menu_items: list[tuple[MenuItem, int]],
) -> Order:
    existing_order = session.scalar(
        select(Order).where(Order.user_id == customer_id, Order.restaurant_id == restaurant_id).limit(1)
    )
    if existing_order:
        return existing_order

    total = sum(item.price * quantity for item, quantity in menu_items)
    order = Order(
        user_id=customer_id,
        restaurant_id=restaurant_id,
        status=OrderStatus.PREPARING,
        total_amount=total,
    )
    session.add(order)
    session.flush()

    for item, quantity in menu_items:
        session.add(
            OrderItem(
                order_id=order.id,
                menu_item_id=item.id,
                quantity=quantity,
                unit_price=item.price,
            )
        )

    return order


def seed() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        customer = get_or_create_user(
            session,
            role=UserRole.CUSTOMER,
            name="Demo Customer",
            email="customer@example.com",
            password="secret123",
        )
        merchant = get_or_create_user(
            session,
            role=UserRole.MERCHANT,
            name="Demo Merchant",
            email="merchant@example.com",
            password="secret123",
        )
        admin = get_or_create_user(
            session,
            role=UserRole.ADMIN,
            name="Demo Admin",
            email="admin@example.com",
            password="secret123",
        )

        rice_house = get_or_create_restaurant(
            session,
            owner_user_id=merchant.id,
            name="Rice House",
            description="Comfort rice bowls and quick lunch sets.",
        )
        noodle_corner = get_or_create_restaurant(
            session,
            owner_user_id=merchant.id,
            name="Noodle Corner",
            description="Hand-pulled noodles, broths, and late-night specials.",
        )

        beef_rice = get_or_create_menu_item(
            session,
            restaurant_id=rice_house.id,
            name="Beef Rice",
            description="Braised beef over jasmine rice.",
            price=Decimal("28.50"),
        )
        get_or_create_menu_item(
            session,
            restaurant_id=rice_house.id,
            name="Chicken Curry Rice",
            description="Yellow curry chicken with potatoes and steamed rice.",
            price=Decimal("24.00"),
        )
        get_or_create_menu_item(
            session,
            restaurant_id=noodle_corner.id,
            name="Spicy Noodles",
            description="Chili oil noodles with slow-cooked beef.",
            price=Decimal("32.00"),
        )
        get_or_create_menu_item(
            session,
            restaurant_id=noodle_corner.id,
            name="Pork Dumplings",
            description="Eight handmade dumplings with black vinegar.",
            price=Decimal("18.00"),
        )

        create_sample_order(
            session,
            customer_id=customer.id,
            restaurant_id=rice_house.id,
            menu_items=[(beef_rice, 2)],
        )

        session.commit()

        print("Seed complete.")
        print("Customer: customer@example.com / secret123")
        print("Merchant: merchant@example.com / secret123")
        print("Admin: admin@example.com / secret123")
        print("Restaurants:", rice_house.name, ",", noodle_corner.name)


if __name__ == "__main__":
    seed()
