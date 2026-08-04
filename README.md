
# BJ Electronics Platform

Production-oriented e-commerce platform with independently built customer and administrator applications, a modular Express API, and a MySQL database layer.

## Structure

```text
apps/
  store/                 Customer storefront entry
  admin/                 Protected operations portal entry
server/
  http/                  Express composition, validation, error handling
  modules/               Auth, catalog, orders, account, admin routes
  repository.js          Transactional MySQL persistence
  auth.js                Customer/admin session boundaries
database/
  schema.sql             Canonical schema
  migrations/            Ordered production migrations
  seeds/                 Optional seed SQL
scripts/
  migrate.mjs            Idempotent migration runner
worker/                   Store/admin application routing
```

## Local development

1. Copy `.env.example` to `.env` and configure MySQL plus administrator credentials.
2. Run `npm ci`.
3. Run `npm run db:migrate`.
4. Run `npm run dev:full`.

Services:

- Storefront: `http://localhost:5173`
- Administrator portal: `http://localhost:5174/admin/login`
- API: `http://localhost:4000/api/health`

## Production validation

```bash
npm ci
npm run check
npm run security:audit
```

## Checkout

The platform intentionally contains no external online payment gateway. Supported order methods are cash on delivery and bank transfer. Inventory is committed atomically when the order is placed and restored when an order is cancelled.
