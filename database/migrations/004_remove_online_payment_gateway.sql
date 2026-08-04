
USE bj_electronics;

DROP TABLE IF EXISTS payments;

UPDATE orders
SET payment_status = CASE
  WHEN payment_status = 'paid' THEN 'paid'
  WHEN payment_status = 'unpaid' THEN 'pending'
  ELSE 'cancelled'
END;

UPDATE orders SET status = 'confirmed' WHERE status = 'pending';

ALTER TABLE orders
  DROP COLUMN payment_provider,
  ADD COLUMN payment_method ENUM('cash_on_delivery', 'bank_transfer') NOT NULL DEFAULT 'cash_on_delivery' AFTER payment_status,
  MODIFY COLUMN status ENUM('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'confirmed',
  MODIFY COLUMN payment_status ENUM('pending', 'awaiting_payment', 'paid', 'refunded', 'cancelled') NOT NULL DEFAULT 'pending';
