USE bj_electronics;

-- The organized Caravan product catalog is idempotently loaded with:
-- npm run db:seed-catalog

INSERT INTO coupons (code, discount_type, discount_value, minimum_order, usage_limit, active)
VALUES
('WELCOME20', 'percent', 20, 5000, 1000, 1),
('TECH10', 'percent', 10, 3000, NULL, 1)
ON DUPLICATE KEY UPDATE
  discount_value = VALUES(discount_value), minimum_order = VALUES(minimum_order), active = VALUES(active);

-- Demo passwords are inserted by `npm run db:seed-users` so bcrypt hashes are generated safely.
