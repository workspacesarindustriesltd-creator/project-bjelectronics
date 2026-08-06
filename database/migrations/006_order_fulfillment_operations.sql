ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS courier VARCHAR(80) NULL AFTER shipping_address,
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120) NULL AFTER courier,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL AFTER tracking_number,
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500) NULL AFTER admin_notes,
  ADD COLUMN IF NOT EXISTS shipped_at DATETIME NULL AFTER cancellation_reason,
  ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL AFTER shipped_at;
