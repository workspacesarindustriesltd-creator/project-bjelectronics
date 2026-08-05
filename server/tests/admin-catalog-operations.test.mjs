import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateCatalogProducts } from "../modules/admin/catalog-operations.js";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");

const product = {
  id: 11,
  sku: "bj-test-001",
  name: "Test Television",
  category: "Television",
  subcategory: "Google TV",
  brand: "Haier",
  description: "A complete product description suitable for validation.",
  price: 22520,
  oldPrice: 29400,
  currency: "BDT",
  stock: 12,
  availability: "in_stock",
  image: "https://example.com/product.png",
  sourceName: "Catalog",
  sourceUrl: "https://example.com/product",
  active: true,
  featured: false,
  createdAt: "2026-08-04T18:53:10.000Z",
};

test("catalog validation accepts import records and removes non-product metadata", () => {
  const result = validateCatalogProducts([product]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].sku, "BJ-TEST-001");
  assert.equal("id" in result.products[0], false);
  assert.equal("createdAt" in result.products[0], false);
});

test("catalog validation blocks duplicate SKUs and incomplete records", () => {
  const result = validateCatalogProducts([
    product,
    { ...product, id: 12, sku: "BJ-TEST-001" },
    { sku: "BROKEN", name: "Incomplete" },
  ]);
  assert.equal(result.products.length, 1);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].message, /Duplicate SKU/);
  assert.match(result.errors[1].message, /category|description|price|stock|image/);
});

test("admin catalog operations expose protected import, bulk and cache workflows", async () => {
  const [routes, component, platform, css] = await Promise.all([
    read("server/modules/admin/catalog-operations.js"),
    read("src/admin/CatalogOperations.jsx"),
    read("src/admin/AdminPlatform.jsx"),
    read("src/admin/catalog-operations.css"),
  ]);

  for (const route of ["/summary", "/preview", "/import", "/bulk", "/cache/purge"]) {
    assert.match(routes, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(routes, /MAX_IMPORT_PRODUCTS = 1000/);
  assert.match(routes, /ON DUPLICATE KEY UPDATE/);
  assert.match(component, /Import catalog/);
  assert.match(component, /Bulk inventory/);
  assert.match(component, /Export CSV/);
  assert.match(component, /\/api\/admin\/catalog\/preview/);
  assert.match(component, /\/api\/admin\/catalog\/import/);
  assert.match(platform, /CatalogNavigationBridge/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media\s*\(max-width:/);
  for (const forbidden of ["CLOUDINARY_API_SECRET", "UPSTASH_REDIS_REST_TOKEN", "admin12345"]) {
    assert.doesNotMatch(component, new RegExp(forbidden));
  }
});
