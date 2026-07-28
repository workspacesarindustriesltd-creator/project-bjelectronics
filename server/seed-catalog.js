import { pool } from "./db.js";
import { importedCatalog } from "../src/data/caravan-catalog.js";

const sql = `
  INSERT INTO products
    (sku, name, category, subcategory, brand, description, price, old_price, currency,
     stock, availability, image_url, source_name, source_url, active, featured)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    category = VALUES(category),
    subcategory = VALUES(subcategory),
    brand = VALUES(brand),
    description = VALUES(description),
    price = VALUES(price),
    old_price = VALUES(old_price),
    currency = VALUES(currency),
    stock = VALUES(stock),
    availability = VALUES(availability),
    image_url = VALUES(image_url),
    source_name = VALUES(source_name),
    source_url = VALUES(source_url),
    active = VALUES(active),
    featured = VALUES(featured)
`;

try {
  for (const product of importedCatalog) {
    await pool.execute(sql, [
      product.sku,
      product.name,
      product.category,
      product.subcategory,
      product.brand,
      product.description,
      product.price,
      product.oldPrice,
      product.currency,
      product.stock,
      product.availability,
      product.image,
      product.sourceName,
      product.sourceUrl,
      product.active,
      product.featured,
    ]);
  }
  console.log(`Seeded ${importedCatalog.length} organized Caravan catalog products.`);
} finally {
  await pool.end();
}

