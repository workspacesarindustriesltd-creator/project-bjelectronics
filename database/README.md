
# Database

MySQL is the single source of truth for customer accounts, catalog data, inventory, orders, addresses, wishlists, reviews, and promotions.

## Commands

- `npm run db:migrate` applies the base schema and every numbered migration once.
- `npm run db:seed-users` creates explicitly configured administrator credentials and the optional local demo customer.
- `npm run db:seed-catalog` imports the organized catalog idempotently.

Production deployments must back up the database before migrations. The gateway-removal migration deletes the obsolete `payments` table and converts existing orders to the offline payment model.
