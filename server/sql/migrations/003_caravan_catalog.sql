USE bj_electronics;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(80) NULL AFTER category,
  ADD COLUMN IF NOT EXISTS brand VARCHAR(80) NULL AFTER subcategory,
  ADD COLUMN IF NOT EXISTS availability ENUM('in_stock', 'preorder') NOT NULL DEFAULT 'in_stock' AFTER stock,
  ADD COLUMN IF NOT EXISTS source_name VARCHAR(80) NULL AFTER image_url,
  ADD COLUMN IF NOT EXISTS source_url VARCHAR(500) NULL AFTER source_name;

ALTER TABLE products
  ALTER COLUMN currency SET DEFAULT 'BDT';

