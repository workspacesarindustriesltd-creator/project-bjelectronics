# BJ Electronics Store + Protected Admin

A production-oriented React/Vite storefront and operations dashboard backed by
a Node.js API, MySQL persistence, and an SSLCOMMERZ checkout integration.

## Domain architecture

| Surface | Production URL | Purpose |
| --- | --- | --- |
| Store | `https://www.bjelectronics.shop` | Customer catalog, accounts, cart, checkout, and order history |
| Admin | `https://admin.bjelectronics.shop/admin/login` | Protected operations login and dashboard |
| API | Same-origin `/api` on both hosts | Node.js API through the deployment reverse proxy |

The client selects the admin application when the hostname starts with
`admin.` or the path starts with `/admin`. Direct visits to
`/admin/dashboard` require a valid administrator session and otherwise return
to `/admin/login`.

For production, point both DNS records at the frontend deployment and proxy
`/api/*` on each hostname to the Node.js service. Keeping the API same-origin
on each host allows the default host-only cookies to remain isolated. Do not
set `COOKIE_DOMAIN` unless a shared parent-domain cookie is explicitly required.

## Included

- Organized Caravan import with 71 deduplicated products, nine departments,
  brands, subcategories, BDT pricing, source traceability, and pre-order states
- Responsive storefront with search, catalog, product detail, wishlist, and cart
- Persistent Add to cart and Buy now actions across product cards and product detail
- Quantity-aware express checkout that preserves the customer's existing cart
- Checkout resumption after sign-in, cart persistence, purchase feedback, and quantity safeguards
- Three-product comparison with responsive side-by-side specifications
- Recently viewed history and persistent save-for-later cart recovery
- Postcode delivery estimates and native/clipboard product sharing
- Authenticated product ratings and reviews with verified-purchase support
- Customer registration, sign-in, saved addresses, and order history
- Dedicated administrator login and protected API session
- Professional admin overview, order fulfillment, products, inventory,
  customers, promotions, payment readiness, and security settings
- Separate `bj_session` and `bj_admin_session` HTTP-only cookies
- Administrator JWT audience and role validation on every admin API
- Transactional MySQL order creation and inventory updates
- SSLCOMMERZ sandbox/live session initiation, callbacks, IPN, and validation
- API integration and deployable-worker route tests

## Quick start

Requirements: Node.js 20+ and MySQL 8+.

```bash
npm install
cp .env.example .env
mysql -u root -p < server/sql/schema.sql
mysql -u root -p bj_electronics < server/sql/seed.sql
npm run db:seed-users
npm run db:seed-catalog
npm run dev:full
```

For an existing database created before the Caravan import, apply
`server/sql/migrations/003_caravan_catalog.sql` before running
`npm run db:seed-catalog`.

## Imported catalog

The catalog was organized from the public listings at
`https://caravan.com.bd/` on July 28, 2026. Duplicate television listings were
collapsed to the best public price, portable power products were separated
from the source site's mixed Water Heater results, and every imported record
retains its public source URL.

| Department | Products |
| --- | ---: |
| Television | 15 |
| Home Appliances | 12 |
| Washing Machine | 7 |
| Fan | 10 |
| Refrigerator & Freezer | 9 |
| Portable Power Station (IPS) | 15 |
| Water Heater | 3 |
| Air Conditioner | 0 |
| Power Bank | 0 |

Air Conditioner and Power Bank remain visible as prepared departments because
their public Caravan category pages currently expose no saleable product
records. Imported in-stock items start with a configurable opening quantity of
12; pre-order products start at zero and cannot be checked out until activated
by an administrator.

The API defaults to port `4000`. Local admin routes are `/admin/login` and
`/admin/dashboard`.

## Administrator credentials

The local preview accepts:

| Field | Local value |
| --- | --- |
| Email | `admin@bjelectronics.shop` |
| Password | `admin12345` |

These values are for local evaluation only. Before production, set a unique
administrator email and strong password in `.env`, then run
`npm run db:seed-users`:

```env
ADMIN_NAME=Store Administrator
ADMIN_EMAIL=your-admin@bjelectronics.shop
ADMIN_PHONE=01700000001
ADMIN_PASSWORD=replace-with-a-long-unique-password
JWT_SECRET=replace-with-a-long-random-secret
```

The storefront login rejects administrator accounts. Administrators must use
the dedicated admin login endpoint, which creates a separate HTTP-only,
SameSite Strict session with an eight-hour expiry.

## Production URLs

Use both server-side and Vite client variables:

```env
NODE_ENV=production
STORE_URL=https://www.bjelectronics.shop
ADMIN_URL=https://admin.bjelectronics.shop
PUBLIC_API_URL=https://www.bjelectronics.shop
VITE_STORE_URL=https://www.bjelectronics.shop
VITE_ADMIN_URL=https://admin.bjelectronics.shop
COOKIE_DOMAIN=
```

`STORE_URL` and `ADMIN_URL` form the API CORS allowlist. The `VITE_*` values
control cross-surface navigation links in the built frontend.

## SSLCOMMERZ setup

The gateway is intentionally left in sandbox mode until credentials are added:

```env
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_IS_LIVE=false
```

SSLCOMMERZ returns customers to the configured success, failure, or
cancellation routes. The IPN route independently validates the transaction
before an order is marked paid and stock is decremented.

Set `SSLCOMMERZ_IS_LIVE=true` only after replacing sandbox credentials with
approved production credentials and verifying public HTTPS callback routes.

## Useful commands

```bash
npm run dev          # frontend only
npm run dev:api      # API only
npm run dev:full     # frontend and API together
npm run build        # production frontend and worker build
npm test             # API and deployment artifact tests
npm start            # Node.js API
npm run db:seed-catalog # idempotently load the organized Caravan catalog
```

## API surface

Customer:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id/reviews`, `POST /api/products/:id/reviews`
- `GET /api/orders`, `GET /api/orders/:id`
- `GET/POST/PATCH/DELETE /api/account/addresses`
- `GET/POST/DELETE /api/account/wishlist`
- `POST /api/coupons/validate`
- `POST /api/payments/sslcommerz/initiate`
- `POST /api/payments/sslcommerz/ipn`

Administrator:

- `POST /api/admin/auth/login`, `GET /api/admin/auth/me`,
  `POST /api/admin/auth/logout`
- `GET/POST/PATCH /api/admin/products`
- `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/customers`
- `GET/POST/PATCH /api/admin/coupons`

The production frontend is emitted to `dist/client`; the deployable worker is
emitted to `dist/server`.
