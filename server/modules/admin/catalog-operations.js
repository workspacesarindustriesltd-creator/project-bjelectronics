import { Router } from "express";
import { z } from "zod";
import { pool, withTransaction } from "../../db.js";
import { parse } from "../../http/validate.js";
import { productSchema } from "../shared/schemas.js";

const CATALOG_CACHE_KEYS = ["catalog:products:active"];
const MAX_IMPORT_PRODUCTS = 1000;
const MAX_BULK_PRODUCTS = 500;

const importPayloadSchema = z.object({
  products: z.array(z.unknown()).min(1).max(MAX_IMPORT_PRODUCTS),
});

const bulkActionSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(MAX_BULK_PRODUCTS),
  action: z.enum(["activate", "hide", "feature", "unfeature", "set_stock", "adjust_stock"]),
  value: z.coerce.number().int().optional(),
}).superRefine((value, context) => {
  if (["set_stock", "adjust_stock"].includes(value.action) && value.value === undefined) {
    context.addIssue({ code: "custom", path: ["value"], message: "A stock value is required for this action." });
  }
  if (value.action === "set_stock" && value.value < 0) {
    context.addIssue({ code: "custom", path: ["value"], message: "Stock cannot be negative." });
  }
});

function normaliseNullable(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function sanitiseProductCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return candidate;
  return {
    sku: candidate.sku,
    name: candidate.name,
    category: candidate.category,
    subcategory: normaliseNullable(candidate.subcategory),
    brand: normaliseNullable(candidate.brand),
    description: candidate.description,
    price: candidate.price,
    oldPrice: normaliseNullable(candidate.oldPrice),
    currency: candidate.currency || "BDT",
    stock: candidate.stock,
    availability: candidate.availability || "in_stock",
    image: candidate.image || candidate.imageUrl,
    sourceName: normaliseNullable(candidate.sourceName),
    sourceUrl: normaliseNullable(candidate.sourceUrl),
    active: candidate.active ?? true,
    featured: candidate.featured ?? false,
  };
}

export function validateCatalogProducts(input) {
  const candidates = Array.isArray(input) ? input : [];
  const errors = [];
  const products = [];
  const seenSkus = new Map();

  candidates.forEach((candidate, index) => {
    const result = productSchema.safeParse(sanitiseProductCandidate(candidate));
    if (!result.success) {
      errors.push({
        index,
        sku: candidate && typeof candidate === "object" ? candidate.sku || null : null,
        message: result.error.issues.map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`).join("; "),
      });
      return;
    }

    const product = result.data;
    const normalisedSku = product.sku.toUpperCase();
    if (seenSkus.has(normalisedSku)) {
      errors.push({
        index,
        sku: product.sku,
        message: `Duplicate SKU in import file; first seen at row ${seenSkus.get(normalisedSku) + 1}.`,
      });
      return;
    }
    seenSkus.set(normalisedSku, index);
    products.push({ ...product, sku: normalisedSku });
  });

  return { products, errors };
}

async function findExistingSkus(skus, connection = pool) {
  if (!skus.length) return new Set();
  const placeholders = skus.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `SELECT sku FROM products WHERE sku IN (${placeholders})`,
    skus,
  );
  return new Set(rows.map((row) => String(row.sku).toUpperCase()));
}

async function upsertProducts(products) {
  return withTransaction(async (connection) => {
    const existingSkus = await findExistingSkus(products.map((product) => product.sku), connection);
    const sql = `INSERT INTO products
      (sku, name, category, subcategory, brand, description, price, old_price, currency, stock, availability, image_url, source_name, source_url, active, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), category = VALUES(category), subcategory = VALUES(subcategory), brand = VALUES(brand),
        description = VALUES(description), price = VALUES(price), old_price = VALUES(old_price), currency = VALUES(currency),
        stock = VALUES(stock), availability = VALUES(availability), image_url = VALUES(image_url),
        source_name = VALUES(source_name), source_url = VALUES(source_url), active = VALUES(active), featured = VALUES(featured)`;

    for (const product of products) {
      await connection.execute(sql, [
        product.sku, product.name, product.category, product.subcategory || null, product.brand || null,
        product.description, product.price, product.oldPrice || null, product.currency || "BDT", product.stock,
        product.availability || "in_stock", product.image, product.sourceName || null, product.sourceUrl || null,
        product.active, product.featured,
      ]);
    }

    const created = products.filter((product) => !existingSkus.has(product.sku)).length;
    return { created, updated: products.length - created, total: products.length };
  });
}

async function getCatalogSummary() {
  const [[totals], [categories], [brands]] = await Promise.all([
    pool.query(`SELECT
      COUNT(*) AS total_products,
      SUM(active = 1) AS active_products,
      SUM(active = 0) AS hidden_products,
      SUM(featured = 1) AS featured_products,
      SUM(stock = 0) AS out_of_stock,
      SUM(stock > 0 AND stock < 10) AS low_stock,
      COALESCE(SUM(stock), 0) AS total_units,
      COALESCE(SUM(stock * price), 0) AS inventory_value,
      COALESCE(AVG(CASE WHEN old_price IS NOT NULL AND old_price > price THEN ((old_price - price) / old_price) * 100 END), 0) AS average_discount
      FROM products`),
    pool.query(`SELECT category, COUNT(*) AS product_count, COALESCE(SUM(stock), 0) AS stock_units,
      COALESCE(SUM(stock * price), 0) AS inventory_value
      FROM products GROUP BY category ORDER BY product_count DESC, category ASC LIMIT 20`),
    pool.query(`SELECT COALESCE(NULLIF(brand, ''), 'Unbranded') AS brand, COUNT(*) AS product_count
      FROM products GROUP BY COALESCE(NULLIF(brand, ''), 'Unbranded') ORDER BY product_count DESC, brand ASC LIMIT 12`),
  ]);

  return {
    totals: {
      totalProducts: Number(totals[0]?.total_products || 0),
      activeProducts: Number(totals[0]?.active_products || 0),
      hiddenProducts: Number(totals[0]?.hidden_products || 0),
      featuredProducts: Number(totals[0]?.featured_products || 0),
      outOfStock: Number(totals[0]?.out_of_stock || 0),
      lowStock: Number(totals[0]?.low_stock || 0),
      totalUnits: Number(totals[0]?.total_units || 0),
      inventoryValue: Number(totals[0]?.inventory_value || 0),
      averageDiscount: Number(totals[0]?.average_discount || 0),
    },
    categories: categories.map((row) => ({
      category: row.category,
      productCount: Number(row.product_count),
      stockUnits: Number(row.stock_units),
      inventoryValue: Number(row.inventory_value),
    })),
    brands: brands.map((row) => ({ brand: row.brand, productCount: Number(row.product_count) })),
  };
}

export function createCatalogOperationsRouter({ cache } = {}) {
  const router = Router();

  router.get("/summary", async (_req, res) => res.json(await getCatalogSummary()));

  router.post("/preview", async (req, res) => {
    const { products: input } = parse(importPayloadSchema, req.body);
    const validation = validateCatalogProducts(input);
    const existingSkus = await findExistingSkus(validation.products.map((product) => product.sku));
    const preview = validation.products.slice(0, 50).map((product) => ({
      sku: product.sku,
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      stock: product.stock,
      operation: existingSkus.has(product.sku) ? "update" : "create",
    }));
    const creates = validation.products.filter((product) => !existingSkus.has(product.sku)).length;
    return res.json({
      valid: validation.products.length,
      invalid: validation.errors.length,
      creates,
      updates: validation.products.length - creates,
      errors: validation.errors.slice(0, 100),
      preview,
      truncatedPreview: validation.products.length > preview.length,
    });
  });

  router.post("/import", async (req, res) => {
    const { products: input } = parse(importPayloadSchema, req.body);
    const validation = validateCatalogProducts(input);
    if (validation.errors.length) {
      return res.status(422).json({
        error: "Catalog import contains invalid products.",
        code: "CATALOG_IMPORT_INVALID",
        invalid: validation.errors.length,
        errors: validation.errors.slice(0, 100),
      });
    }
    const result = await upsertProducts(validation.products);
    await cache?.deleteMany?.(CATALOG_CACHE_KEYS);
    return res.status(201).json({ ...result, cacheInvalidated: Boolean(cache?.deleteMany) });
  });

  router.patch("/bulk", async (req, res) => {
    const { ids, action, value } = parse(bulkActionSchema, req.body);
    const uniqueIds = [...new Set(ids)];
    const placeholders = uniqueIds.map(() => "?").join(",");
    let expression;
    let values = [];

    if (action === "activate") expression = "active = 1";
    if (action === "hide") expression = "active = 0";
    if (action === "feature") expression = "featured = 1";
    if (action === "unfeature") expression = "featured = 0";
    if (action === "set_stock") {
      expression = "stock = ?";
      values = [value];
    }
    if (action === "adjust_stock") {
      expression = "stock = GREATEST(0, stock + ?)";
      values = [value];
    }

    const [result] = await pool.execute(
      `UPDATE products SET ${expression} WHERE id IN (${placeholders})`,
      [...values, ...uniqueIds],
    );
    await cache?.deleteMany?.(CATALOG_CACHE_KEYS);
    return res.json({ updated: result.affectedRows, action });
  });

  router.post("/cache/purge", async (_req, res) => {
    if (!cache?.deleteMany) {
      return res.status(503).json({ error: "Redis catalog cache is not configured.", code: "CACHE_DISABLED" });
    }
    await cache.deleteMany(CATALOG_CACHE_KEYS);
    return res.json({ purged: true, keys: CATALOG_CACHE_KEYS });
  });

  return router;
}
