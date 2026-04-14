import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base, get_db
from app.main import app
from app.models.restaurant import Restaurant, RestaurantStatus


TEST_DB_PATH = Path(tempfile.gettempdir()) / f"food_delivery_test_{uuid4().hex}.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module():
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


def register_user(role: str, name: str, email: str) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "role": role,
            "name": name,
            "email": email,
            "password": "secret123",
        },
    )
    assert response.status_code == 200
    return response.json()


def test_register_login_restaurants_cart_and_orders():
    register_response = register_user("customer", "Alice", "alice@example.com")
    token = register_response["access_token"]

    merchant_response = register_user("merchant", "Merchant", "merchant@example.com")
    merchant_id = merchant_response["user"]["id"]

    with TestingSessionLocal() as db:
        restaurant = Restaurant(
            owner_user_id=merchant_id,
            name="Rice House",
            description="Comfort food",
            status="active",
        )
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)
        restaurant_id = restaurant.id

    headers = {"Authorization": f"Bearer {token}"}

    restaurants_response = client.get("/api/v1/restaurants", headers=headers)
    assert restaurants_response.status_code == 200
    assert len(restaurants_response.json()) == 1

    menu_response = client.post(
        "/api/v1/merchant/menu-items",
        headers={"Authorization": f"Bearer {merchant_response['access_token']}"},
        json={
            "restaurant_id": restaurant_id,
            "name": "Beef Rice",
            "description": "Braised beef over rice",
            "price": 28.5,
            "is_available": True,
        },
    )
    assert menu_response.status_code == 200
    menu_item_id = menu_response.json()["id"]

    restaurant_menu_response = client.get(f"/api/v1/restaurants/{restaurant_id}/menu", headers=headers)
    assert restaurant_menu_response.status_code == 200
    assert restaurant_menu_response.json()[0]["id"] == menu_item_id

    cart_add_response = client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"menu_item_id": menu_item_id, "quantity": 2},
    )
    assert cart_add_response.status_code == 200
    assert cart_add_response.json()["total_amount"] == 57.0

    order_response = client.post("/api/v1/orders", headers=headers, json={})
    assert order_response.status_code == 200
    order_id = order_response.json()["id"]

    order_list_response = client.get("/api/v1/orders", headers=headers)
    assert order_list_response.status_code == 200
    assert len(order_list_response.json()) == 1

    order_detail_response = client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert order_detail_response.status_code == 200
    assert order_detail_response.json()["items"][0]["quantity"] == 2


def test_merchant_and_admin_mvp_views():
    merchant_response = register_user("merchant", "Shop Owner", "owner@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Noodle Corner", "description": "Fresh hand-pulled noodles"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    owned_restaurants_response = client.get("/api/v1/merchant/restaurants", headers=merchant_headers)
    assert owned_restaurants_response.status_code == 200
    assert owned_restaurants_response.json()[0]["id"] == restaurant_id

    menu_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Spicy Noodles",
            "description": "Chili oil and beef",
            "price": 32,
            "is_available": True,
        },
    )
    assert menu_response.status_code == 200

    customer_response = register_user("customer", "Customer", "customer@example.com")
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_response.json()["id"], "quantity": 1},
    )
    order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert order_response.status_code == 200
    order_id = order_response.json()["id"]

    order_update_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "confirmed"},
    )
    assert order_update_response.status_code == 200
    assert order_update_response.json()["status"] == "confirmed"

    admin_response = register_user("admin", "Admin", "admin@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_response['access_token']}"}

    admin_restaurants_response = client.get("/api/v1/admin/restaurants", headers=admin_headers)
    assert admin_restaurants_response.status_code == 200
    assert any(restaurant["id"] == restaurant_id for restaurant in admin_restaurants_response.json())

    admin_orders_response = client.get("/api/v1/admin/orders", headers=admin_headers)
    assert admin_orders_response.status_code == 200
    assert admin_orders_response.json()[0]["status"] == "confirmed"


def test_auth_and_cart_edge_cases():
    unauthenticated_restaurants_response = client.get("/api/v1/restaurants")
    assert unauthenticated_restaurants_response.status_code == 401

    bad_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "password": "secret123"},
    )
    assert bad_login_response.status_code == 401

    customer_response = register_user("customer", "Edge Customer", "edge-customer@example.com")
    merchant_response = register_user("merchant", "Edge Merchant", "edge-merchant@example.com")
    headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    with TestingSessionLocal() as db:
        restaurant_a = Restaurant(
            owner_user_id=merchant_response["user"]["id"],
            name="Restaurant A",
            description="First restaurant",
            status="active",
        )
        restaurant_b = Restaurant(
            owner_user_id=merchant_response["user"]["id"],
            name="Restaurant B",
            description="Second restaurant",
            status="active",
        )
        db.add_all([restaurant_a, restaurant_b])
        db.commit()
        db.refresh(restaurant_a)
        db.refresh(restaurant_b)
        restaurant_a_id = restaurant_a.id
        restaurant_b_id = restaurant_b.id

    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    item_a = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_a_id,
            "name": "Available Dish",
            "description": "Ready to sell",
            "price": 20,
            "is_available": True,
        },
    )
    item_b = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_b_id,
            "name": "Second Dish",
            "description": "Other restaurant item",
            "price": 18,
            "is_available": True,
        },
    )
    sold_out = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_a_id,
            "name": "Sold Out Dish",
            "description": "Unavailable item",
            "price": 15,
            "is_available": False,
        },
    )
    assert item_a.status_code == 200
    assert item_b.status_code == 200
    assert sold_out.status_code == 200

    add_first_response = client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"menu_item_id": item_a.json()["id"], "quantity": 1},
    )
    assert add_first_response.status_code == 200
    cart_item_id = add_first_response.json()["items"][0]["id"]

    update_response = client.patch(
        f"/api/v1/cart/items/{cart_item_id}",
        headers=headers,
        json={"quantity": 3},
    )
    assert update_response.status_code == 200
    assert update_response.json()["items"][0]["quantity"] == 3

    mixed_cart_response = client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"menu_item_id": item_b.json()["id"], "quantity": 1},
    )
    assert mixed_cart_response.status_code == 400

    sold_out_response = client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"menu_item_id": sold_out.json()["id"], "quantity": 1},
    )
    assert sold_out_response.status_code == 404

    delete_response = client.delete(f"/api/v1/cart/items/{cart_item_id}", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["items"] == []


def test_permission_and_ownership_guards():
    customer_response = register_user("customer", "Guard Customer", "guard-customer@example.com")
    admin_response = register_user("admin", "Guard Admin", "guard-admin@example.com")
    merchant_a_response = register_user("merchant", "Merchant A", "merchant-a@example.com")
    merchant_b_response = register_user("merchant", "Merchant B", "merchant-b@example.com")

    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}
    admin_headers = {"Authorization": f"Bearer {admin_response['access_token']}"}
    merchant_a_headers = {"Authorization": f"Bearer {merchant_a_response['access_token']}"}
    merchant_b_headers = {"Authorization": f"Bearer {merchant_b_response['access_token']}"}

    customer_forbidden_response = client.get("/api/v1/merchant/restaurants", headers=customer_headers)
    assert customer_forbidden_response.status_code == 403

    admin_forbidden_response = client.get("/api/v1/admin/orders", headers=customer_headers)
    assert admin_forbidden_response.status_code == 403

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_a_headers,
        json={"name": "Merchant A Kitchen", "description": "Owned by merchant A"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    foreign_menu_create_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_b_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Foreign Edit",
            "description": "Should not be allowed",
            "price": 19.5,
            "is_available": True,
        },
    )
    assert foreign_menu_create_response.status_code == 403

    owned_menu_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_a_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Signature Meal",
            "description": "Owned item",
            "price": 21,
            "is_available": True,
        },
    )
    assert owned_menu_response.status_code == 200
    menu_item_id = owned_menu_response.json()["id"]

    foreign_menu_update_response = client.patch(
        f"/api/v1/merchant/menu-items/{menu_item_id}",
        headers=merchant_b_headers,
        json={"price": 25},
    )
    assert foreign_menu_update_response.status_code == 403

    empty_cart_order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert empty_cart_order_response.status_code == 400

    owner_customer_response = register_user("customer", "Order Owner", "order-owner@example.com")
    outsider_customer_response = register_user("customer", "Order Outsider", "order-outsider@example.com")
    owner_headers = {"Authorization": f"Bearer {owner_customer_response['access_token']}"}
    outsider_headers = {"Authorization": f"Bearer {outsider_customer_response['access_token']}"}

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=owner_headers,
        json={"menu_item_id": menu_item_id, "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200

    create_order_response = client.post("/api/v1/orders", headers=owner_headers, json={})
    assert create_order_response.status_code == 200
    order_id = create_order_response.json()["id"]

    foreign_order_response = client.get(f"/api/v1/orders/{order_id}", headers=outsider_headers)
    assert foreign_order_response.status_code == 404

    admin_access_response = client.get("/api/v1/admin/orders", headers=admin_headers)
    assert admin_access_response.status_code == 200


def test_merchant_order_status_transition_rules():
    merchant_response = register_user("merchant", "Flow Merchant", "flow-merchant@example.com")
    customer_response = register_user("customer", "Flow Customer", "flow-customer@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Flow Restaurant", "description": "Status flow test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Flow Meal",
            "description": "Used for status flow",
            "price": 26,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_response.json()["id"], "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200

    create_order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert create_order_response.status_code == 200
    order_id = create_order_response.json()["id"]

    invalid_transition_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "completed"},
    )
    assert invalid_transition_response.status_code == 400

    confirmed_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "confirmed"},
    )
    assert confirmed_response.status_code == 200
    assert confirmed_response.json()["status"] == "confirmed"

    preparing_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "preparing"},
    )
    assert preparing_response.status_code == 200
    assert preparing_response.json()["status"] == "preparing"

    completed_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "completed"},
    )
    assert completed_response.status_code == 200
    assert completed_response.json()["status"] == "completed"

    terminal_transition_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "cancelled"},
    )
    assert terminal_transition_response.status_code == 400


def test_customers_cannot_access_inactive_restaurants():
    customer_response = register_user("customer", "Inactive Guard", "inactive-guard@example.com")
    merchant_response = register_user("merchant", "Inactive Merchant", "inactive-merchant@example.com")
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    with TestingSessionLocal() as db:
        active_restaurant = Restaurant(
            owner_user_id=merchant_response["user"]["id"],
            name="Active Restaurant",
            description="Visible to customers",
            status=RestaurantStatus.ACTIVE,
        )
        inactive_restaurant = Restaurant(
            owner_user_id=merchant_response["user"]["id"],
            name="Inactive Restaurant",
            description="Hidden from customers",
            status=RestaurantStatus.INACTIVE,
        )
        db.add_all([active_restaurant, inactive_restaurant])
        db.commit()
        db.refresh(active_restaurant)
        db.refresh(inactive_restaurant)
        active_restaurant_id = active_restaurant.id
        inactive_restaurant_id = inactive_restaurant.id

    list_response = client.get("/api/v1/restaurants", headers=customer_headers)
    assert list_response.status_code == 200
    returned_ids = {restaurant["id"] for restaurant in list_response.json()}
    assert active_restaurant_id in returned_ids
    assert inactive_restaurant_id not in returned_ids

    active_detail_response = client.get(f"/api/v1/restaurants/{active_restaurant_id}", headers=customer_headers)
    assert active_detail_response.status_code == 200

    inactive_detail_response = client.get(f"/api/v1/restaurants/{inactive_restaurant_id}", headers=customer_headers)
    assert inactive_detail_response.status_code == 404

    inactive_menu_response = client.get(f"/api/v1/restaurants/{inactive_restaurant_id}/menu", headers=customer_headers)
    assert inactive_menu_response.status_code == 404


def test_merchant_input_validation_rejects_invalid_restaurant_and_menu_data():
    merchant_response = register_user("merchant", "Validation Merchant", "validation-merchant@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}

    blank_restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "   ", "description": "still invalid because name is blank"},
    )
    assert blank_restaurant_response.status_code == 422

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Validated Restaurant", "description": "Valid merchant restaurant"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    negative_price_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Bad Price Item",
            "description": "Should be rejected",
            "price": -1,
            "is_available": True,
        },
    )
    assert negative_price_response.status_code == 422

    blank_name_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": " ",
            "description": "Should be rejected",
            "price": 18,
            "is_available": True,
        },
    )
    assert blank_name_response.status_code == 422

    valid_menu_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Valid Menu Item",
            "description": "Created after validation checks",
            "price": 18,
            "is_available": True,
        },
    )
    assert valid_menu_response.status_code == 200

    invalid_update_response = client.patch(
        f"/api/v1/merchant/menu-items/{valid_menu_response.json()['id']}",
        headers=merchant_headers,
        json={"price": 0},
    )
    assert invalid_update_response.status_code == 422


def test_merchant_cannot_delete_menu_item_with_cart_or_order_references():
    merchant_response = register_user("merchant", "Delete Guard Merchant", "delete-guard-merchant@example.com")
    customer_response = register_user("customer", "Delete Guard Customer", "delete-guard-customer@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Protected Restaurant", "description": "Delete guard test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    deletable_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Fresh Item",
            "description": "Has no references yet",
            "price": 12,
            "is_available": True,
        },
    )
    assert deletable_item_response.status_code == 200

    deletable_delete_response = client.delete(
        f"/api/v1/merchant/menu-items/{deletable_item_response.json()['id']}",
        headers=merchant_headers,
    )
    assert deletable_delete_response.status_code == 204

    protected_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Protected Item",
            "description": "Will be referenced by cart and order",
            "price": 22,
            "is_available": True,
        },
    )
    assert protected_item_response.status_code == 200
    protected_item_id = protected_item_response.json()["id"]

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": protected_item_id, "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200

    cart_delete_response = client.delete(
        f"/api/v1/merchant/menu-items/{protected_item_id}",
        headers=merchant_headers,
    )
    assert cart_delete_response.status_code == 400

    create_order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert create_order_response.status_code == 200

    order_delete_response = client.delete(
        f"/api/v1/merchant/menu-items/{protected_item_id}",
        headers=merchant_headers,
    )
    assert order_delete_response.status_code == 400


def test_auth_email_normalization_prevents_case_variant_duplicates():
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "role": "customer",
            "name": "Email Case User",
            "email": "CaseUser@Example.COM",
            "password": "secret123",
        },
    )
    assert register_response.status_code == 200
    assert register_response.json()["user"]["email"] == "caseuser@example.com"

    duplicate_register_response = client.post(
        "/api/v1/auth/register",
        json={
            "role": "customer",
            "name": "Duplicate User",
            "email": "caseuser@example.com",
            "password": "secret123",
        },
    )
    assert duplicate_register_response.status_code == 409

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "CASEUSER@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["email"] == "caseuser@example.com"


def test_order_creation_fails_when_cart_item_becomes_unavailable():
    merchant_response = register_user("merchant", "Availability Merchant", "availability-merchant@example.com")
    customer_response = register_user("customer", "Availability Customer", "availability-customer@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Availability Restaurant", "description": "Checkout validation test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Limited Dish",
            "description": "Will become unavailable before checkout",
            "price": 24,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200
    menu_item_id = menu_item_response.json()["id"]

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_id, "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200

    mark_unavailable_response = client.patch(
        f"/api/v1/merchant/menu-items/{menu_item_id}",
        headers=merchant_headers,
        json={"is_available": False},
    )
    assert mark_unavailable_response.status_code == 200

    create_order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert create_order_response.status_code == 400


def test_invalid_token_is_rejected_across_protected_endpoints():
    invalid_headers = {"Authorization": "Bearer definitely-invalid-token"}

    cart_response = client.get("/api/v1/cart", headers=invalid_headers)
    assert cart_response.status_code == 401

    merchant_response = client.get("/api/v1/merchant/restaurants", headers=invalid_headers)
    assert merchant_response.status_code == 401

    admin_response = client.get("/api/v1/admin/orders", headers=invalid_headers)
    assert admin_response.status_code == 401


def test_customer_cannot_modify_or_delete_other_customers_cart_items():
    merchant_response = register_user("merchant", "Cart Merchant", "cart-merchant@example.com")
    owner_response = register_user("customer", "Cart Owner", "cart-owner@example.com")
    outsider_response = register_user("customer", "Cart Outsider", "cart-outsider@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    owner_headers = {"Authorization": f"Bearer {owner_response['access_token']}"}
    outsider_headers = {"Authorization": f"Bearer {outsider_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Cart Guard Restaurant", "description": "Cart ownership test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Cart Guard Dish",
            "description": "Owned cart item",
            "price": 19,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=owner_headers,
        json={"menu_item_id": menu_item_response.json()["id"], "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200
    cart_item_id = add_to_cart_response.json()["items"][0]["id"]

    update_response = client.patch(
        f"/api/v1/cart/items/{cart_item_id}",
        headers=outsider_headers,
        json={"quantity": 2},
    )
    assert update_response.status_code == 404

    delete_response = client.delete(f"/api/v1/cart/items/{cart_item_id}", headers=outsider_headers)
    assert delete_response.status_code == 404


def test_merchant_cannot_update_orders_from_other_restaurants():
    merchant_a_response = register_user("merchant", "Order Merchant A", "order-merchant-a@example.com")
    merchant_b_response = register_user("merchant", "Order Merchant B", "order-merchant-b@example.com")
    customer_response = register_user("customer", "Order Customer", "order-customer@example.com")
    merchant_a_headers = {"Authorization": f"Bearer {merchant_a_response['access_token']}"}
    merchant_b_headers = {"Authorization": f"Bearer {merchant_b_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_a_headers,
        json={"name": "Merchant A Order Shop", "description": "Ownership order test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_a_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Ownership Meal",
            "description": "Only merchant A should control this order",
            "price": 23,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_response.json()["id"], "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200

    order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert order_response.status_code == 200
    order_id = order_response.json()["id"]

    foreign_update_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_b_headers,
        json={"status": "confirmed"},
    )
    assert foreign_update_response.status_code == 404


def test_not_found_resources_return_expected_errors():
    customer_response = register_user("customer", "Missing Customer", "missing-customer@example.com")
    merchant_response = register_user("merchant", "Missing Merchant", "missing-merchant@example.com")
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}

    missing_restaurant_detail = client.get("/api/v1/restaurants/9999", headers=customer_headers)
    assert missing_restaurant_detail.status_code == 404

    missing_restaurant_menu = client.get("/api/v1/restaurants/9999/menu", headers=customer_headers)
    assert missing_restaurant_menu.status_code == 404

    missing_order_detail = client.get("/api/v1/orders/9999", headers=customer_headers)
    assert missing_order_detail.status_code == 404

    missing_cart_update = client.patch(
        "/api/v1/cart/items/9999",
        headers=customer_headers,
        json={"quantity": 2},
    )
    assert missing_cart_update.status_code == 404

    missing_cart_delete = client.delete("/api/v1/cart/items/9999", headers=customer_headers)
    assert missing_cart_delete.status_code == 404

    missing_menu_update = client.patch(
        "/api/v1/merchant/menu-items/9999",
        headers=merchant_headers,
        json={"price": 20},
    )
    assert missing_menu_update.status_code == 404

    missing_menu_delete = client.delete("/api/v1/merchant/menu-items/9999", headers=merchant_headers)
    assert missing_menu_delete.status_code == 404

    missing_order_status_update = client.patch(
        "/api/v1/merchant/orders/9999/status",
        headers=merchant_headers,
        json={"status": "confirmed"},
    )
    assert missing_order_status_update.status_code == 404


def test_auth_and_request_validation_errors():
    invalid_register_response = client.post(
        "/api/v1/auth/register",
        json={
            "role": "customer",
            "name": "A",
            "email": "not-an-email",
            "password": "123",
        },
    )
    assert invalid_register_response.status_code == 422

    invalid_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "bad-email", "password": "123"},
    )
    assert invalid_login_response.status_code == 422


def test_cart_quantity_validation_rejects_out_of_range_values():
    merchant_response = register_user("merchant", "Quantity Merchant", "quantity-merchant@example.com")
    customer_response = register_user("customer", "Quantity Customer", "quantity-customer@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Quantity Restaurant", "description": "Quantity validation test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Quantity Dish",
            "description": "Used for quantity validation",
            "price": 20,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200
    menu_item_id = menu_item_response.json()["id"]

    zero_quantity_add_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_id, "quantity": 0},
    )
    assert zero_quantity_add_response.status_code == 422

    large_quantity_add_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_id, "quantity": 100},
    )
    assert large_quantity_add_response.status_code == 422

    valid_add_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_id, "quantity": 1},
    )
    assert valid_add_response.status_code == 200
    cart_item_id = valid_add_response.json()["items"][0]["id"]

    invalid_update_response = client.patch(
        f"/api/v1/cart/items/{cart_item_id}",
        headers=customer_headers,
        json={"quantity": 0},
    )
    assert invalid_update_response.status_code == 422


def test_invalid_order_status_payload_is_rejected():
    merchant_response = register_user("merchant", "Enum Merchant", "enum-merchant@example.com")
    customer_response = register_user("customer", "Enum Customer", "enum-customer@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Enum Restaurant", "description": "Enum validation test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Enum Dish",
            "description": "Enum payload validation",
            "price": 21,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_response.json()["id"], "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200

    order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert order_response.status_code == 200
    order_id = order_response.json()["id"]

    invalid_status_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "shipping"},
    )
    assert invalid_status_response.status_code == 422


def test_repeated_add_to_cart_accumulates_quantity_instead_of_creating_duplicates():
    merchant_response = register_user("merchant", "Repeat Merchant", "repeat-merchant@example.com")
    customer_response = register_user("customer", "Repeat Customer", "repeat-customer@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Repeat Restaurant", "description": "Repeat add test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Repeat Dish",
            "description": "Quantity should accumulate",
            "price": 18,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200
    menu_item_id = menu_item_response.json()["id"]

    first_add_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_id, "quantity": 1},
    )
    assert first_add_response.status_code == 200

    second_add_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_id, "quantity": 2},
    )
    assert second_add_response.status_code == 200
    assert len(second_add_response.json()["items"]) == 1
    assert second_add_response.json()["items"][0]["quantity"] == 3
    assert second_add_response.json()["total_amount"] == 54.0


def test_same_order_status_update_is_allowed_as_noop():
    merchant_response = register_user("merchant", "Noop Merchant", "noop-merchant@example.com")
    customer_response = register_user("customer", "Noop Customer", "noop-customer@example.com")
    merchant_headers = {"Authorization": f"Bearer {merchant_response['access_token']}"}
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    restaurant_response = client.post(
        "/api/v1/merchant/restaurants",
        headers=merchant_headers,
        json={"name": "Noop Restaurant", "description": "No-op status update test"},
    )
    assert restaurant_response.status_code == 200
    restaurant_id = restaurant_response.json()["id"]

    menu_item_response = client.post(
        "/api/v1/merchant/menu-items",
        headers=merchant_headers,
        json={
            "restaurant_id": restaurant_id,
            "name": "Noop Dish",
            "description": "No-op status update payload",
            "price": 20,
            "is_available": True,
        },
    )
    assert menu_item_response.status_code == 200

    add_to_cart_response = client.post(
        "/api/v1/cart/items",
        headers=customer_headers,
        json={"menu_item_id": menu_item_response.json()["id"], "quantity": 1},
    )
    assert add_to_cart_response.status_code == 200

    order_response = client.post("/api/v1/orders", headers=customer_headers, json={})
    assert order_response.status_code == 200
    order_id = order_response.json()["id"]

    noop_update_response = client.patch(
        f"/api/v1/merchant/orders/{order_id}/status",
        headers=merchant_headers,
        json={"status": "pending"},
    )
    assert noop_update_response.status_code == 200
    assert noop_update_response.json()["status"] == "pending"


def test_get_cart_returns_stable_empty_shape_for_new_customer():
    customer_response = register_user("customer", "Empty Cart Customer", "empty-cart-customer@example.com")
    customer_headers = {"Authorization": f"Bearer {customer_response['access_token']}"}

    cart_response = client.get("/api/v1/cart", headers=customer_headers)
    assert cart_response.status_code == 200
    assert cart_response.json()["items"] == []
    assert cart_response.json()["restaurant_id"] is None
    assert cart_response.json()["total_amount"] == 0.0
