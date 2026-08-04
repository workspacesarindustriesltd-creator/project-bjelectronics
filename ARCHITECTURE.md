
# BJ Electronics production architecture

## Deployable applications

- `apps/store` — customer storefront on `bjelectronics.shop` or port `5173` locally.
- `apps/admin` — protected administrator portal at `bjelectronics.shop/admin` or port `5174` locally.
- `server` — Express API on port `4000`, organized by business module.
- `database` — MySQL schema, numbered migrations, and seed assets.

The storefront and administrator portal are compiled independently. Production packaging combines their immutable assets under `dist/client`, while the worker routes each hostname and route family to the correct application shell.

## Checkout model

No online payment gateway exists in this codebase. Customers place orders using cash on delivery or bank transfer. Product rows are locked during order placement, stock is deducted with guarded updates, and cancelled orders restore inventory transactionally.

## Quality controls

`npm run check` runs all API, repository-contract, worker-routing tests, both frontend production builds, and packaging verification. `npm run security:audit` blocks high-severity production dependency findings.
