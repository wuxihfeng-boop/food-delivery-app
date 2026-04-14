# Frontend

Next.js customer-facing web app for the food delivery MVP.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm run test:run
```

## Verify

```bash
npm run test:run
npm run build
```

Set `FRONTEND_API_BASE_URL` to the backend host if it is not `http://localhost:8000`.

## Current MVP scope

- Browse restaurants and menus
- Register or sign in as a customer
- Add menu items to cart
- Update cart quantities and remove items
- Place an order and review order history
- Register or sign in as a merchant and manage restaurants, menu items, and order status
- Register or sign in as an admin and review platform restaurants and orders

## Current Test Coverage

- Shared auth session flows: register, role mismatch login, logout
- Customer flows: restaurant search, restaurant detail refresh/error state, menu availability filter, cart actions
- Merchant flows: menu search, order filter, refresh, form focus behavior
- Admin flows: restaurant search, order status filter, refresh
