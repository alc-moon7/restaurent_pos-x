## Restaurant POS - Split Backend Setup

This setup now uses two API targets during development:

- owner onboarding, owner login, and admin/staff flows use the Django backend
- public customer menu/order tracking can continue using the customer API target

That means `/`, `/login`, and `/admin/login` depend on the backend being up, while `/r/{restaurantId}/o/{outletId}` can still use the customer ordering API.

### Moon Test 4 Cloudflare Pages Mode

This repository is configured to open the Moon Test 4 customer menu by default.
Customers do not need to enter restaurant ID, outlet ID, IP, or port.

Deployment commands are documented in `CLOUDFLARE_DEPLOYMENT.md`.

Default cloud target:

```text
Restaurant: Moon test 4
Restaurant ID: rest_c46f1be2fa034b11b0
Outlet: প্রধান আউটলেট
Outlet ID: outlet_0884a3c2b8314bfb9c
Cloud API: https://vnhxfvtpkgykatvbrczn.supabase.co/functions/v1/pos-api
```

Cloudflare Pages environment variables can still override the default:

```bash
PLATFORM_API_BASE_URL=https://vnhxfvtpkgykatvbrczn.supabase.co/functions/v1/pos-api
NEXT_PUBLIC_RESTAURANT_ID=rest_c46f1be2fa034b11b0
NEXT_PUBLIC_OUTLET_ID=outlet_0884a3c2b8314bfb9c
NEXT_PUBLIC_DEFAULT_TABLE_ID=A1
NEXT_PUBLIC_MENU_BASE_URL=https://menu.yourdomain.com
```

The root page `/` redirects automatically to:

```text
/r/rest_c46f1be2fa034b11b0/o/outlet_0884a3c2b8314bfb9c?table=A1
```

### Backend API

- Base URL:
  - `http://127.0.0.1:4000/api/v1`
- Frontend env:
  - `PLATFORM_BACKEND_API_BASE_URL=http://127.0.0.1:4000/api/v1`

### Customer API

- Base URL:
  - `https://vnhxfvtpkgykatvbrczn.supabase.co/functions/v1/pos-api`
- Frontend env:
  - `PLATFORM_API_BASE_URL=https://vnhxfvtpkgykatvbrczn.supabase.co/functions/v1/pos-api`
  - `NEXT_PUBLIC_MENU_BASE_URL=https://menu.yourdomain.com`

### Owner and admin flows

These pages now talk to the backend API:

- `/`
- `/login`
- `/admin/login`

The backend must expose:

- `GET /owner/plans`
- `POST /owner/auth/request-otp`
- `POST /owner/auth/verify-otp`
- `POST /owner/auth/login`
- `POST /owner/payments/session`
- `POST /owner/payments/callback`
- `GET /owner/payments/status`
- `POST /owner/onboarding/setup`
- `POST /staff/auth/login`

### Public customer contract

No authorization token is required for customer ordering.

- `GET /health`
- `GET /outlets/{outletId}/bootstrap`
- `GET /outlets/{outletId}/menu`
- `POST /outlets/{outletId}/orders`
- `GET /outlets/{outletId}/orders/{orderId}`

### Customer URL format

- Public menu URL:
  - `https://your-menu-domain.com/r/{restaurantId}/o/{outletId}`
- Table QR should include a table label in the query string:
  - `https://your-menu-domain.com/r/{restaurantId}/o/{outletId}?table=A1`

`restaurantId` and `outletId` come from Admin -> Settings.

### Customer order behavior

The website now follows the cloud-first payload shape:

```json
{
  "id": "unique-order-uuid",
  "source": "cloud_customer",
  "customerName": "Customer Name",
  "tableNo": "A1",
  "note": "Less spicy",
  "items": [
    {
      "menuItemId": "menu_item_id_here",
      "qty": 2
    }
  ]
}
```

Important:

- send only `menuItemId` and `qty` per item
- use a UUID for both `id` and `Idempotency-Key`
- backend validates item availability and calculates totals
- customer order tracking polls every 10 seconds

### Current local run

Run both services:

```bash
cd backend
python manage.py runserver

cd ..
npm run dev
```

For the cloud backend package in this repo:

```bash
cd cloud-backend-API-for-Hybrid-Restaurant-POS-Admin-app
npm run db:migrate
npm run dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/login`
- `http://localhost:3000/admin/login`
- `http://localhost:3000/r/{restaurantId}/o/{outletId}?table=A1`

- owner/admin flows use the backend URL from `.env.local`
- customer QR flow uses the customer API URL from `.env.local`

### Admin behavior

Once the customer website posts an order to cloud:

- the Admin app syncs or detects it automatically
- the order appears in Admin dashboard/orders
- if printer auto-print is enabled in the admin flow, ticket printing can happen there

### Current scope

Implemented for this phase:

- public menu load by `outletId`
- public order create by `outletId`
- public order tracking by `outletId` and `orderId`
- QR URL generation with `restaurantId`, `outletId`, and table label

Not part of this cloud-first contract:

- waiter-call from customer web
- GPS/geofence validation
- one-IP-one-order restriction

### Next phase

After this customer web flow is stable, the target production move is:

- one EC2 with Nginx
- Next.js web app
- Django + Gunicorn backend
- PostgreSQL on the same EC2 initially
