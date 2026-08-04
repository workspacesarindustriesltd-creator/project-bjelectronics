from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = ROOT / "ARCHITECTURE.md"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match in {path}, found {count}: {old[:80]!r}")
    write(path, source.replace(old, new, 1))


def replace_range(path: str, start: str, end: str, replacement: str) -> None:
    source = read(path)
    start_index = source.find(start)
    if start_index < 0:
        raise RuntimeError(f"Start marker missing in {path}: {start!r}")
    end_index = source.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f"End marker missing in {path}: {end!r}")
    write(path, source[:start_index] + replacement + source[end_index:])


if MARKER.exists() and not (ROOT / "server/payment-gateway.js").exists():
    print("Production architecture refactor already applied.")
    raise SystemExit(0)

# Root package and commands.
package = json.loads(read("package.json"))
package["name"] = "bj-electronics-platform"
package["version"] = "4.0.0"
package["scripts"] = {
    "dev": "npm run dev:store",
    "dev:store": "vite --config vite.store.config.mjs",
    "dev:admin": "vite --config vite.admin.config.mjs",
    "dev:api": "node --watch server/index.js",
    "dev:full": "concurrently -n STORE,ADMIN,API -c blue,magenta,green \"npm:dev:store\" \"npm:dev:admin\" \"npm:dev:api\"",
    "start": "node server/index.js",
    "build": "npm run build:store && npm run build:admin && node scripts/prepare-production-build.mjs",
    "build:store": "vite build --config vite.store.config.mjs",
    "build:admin": "vite build --config vite.admin.config.mjs",
    "preview:store": "vite preview --config vite.store.config.mjs",
    "preview:admin": "vite preview --config vite.admin.config.mjs",
    "test": "node --test server/tests/*.test.mjs tests/sites-worker.test.mjs",
    "test:api": "node --test server/tests/*.test.mjs",
    "test:sites": "node --test tests/sites-worker.test.mjs",
    "check": "npm test && npm run build",
    "security:audit": "npm audit --audit-level=high --omit=dev",
    "db:migrate": "node scripts/migrate.mjs",
    "db:seed-users": "node server/seed-users.js",
    "db:seed-catalog": "node server/seed-catalog.js",
}
write("package.json", json.dumps(package, indent=2) + "\n")

write(".env.example", """
NODE_ENV=development
PORT=4000
STORE_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
PUBLIC_API_URL=http://localhost:4000
VITE_STORE_URL=http://localhost:5173
VITE_ADMIN_URL=http://localhost:5174
JWT_SECRET=replace-with-a-random-secret-containing-at-least-32-characters
COOKIE_DOMAIN=

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bj_electronics
DB_CONNECTION_LIMIT=10

ADMIN_NAME=Store Administrator
ADMIN_EMAIL=
ADMIN_PHONE=
ADMIN_PASSWORD=
SEED_DEMO_USER=false
""")

# Separate storefront and administrator build entries.
write("apps/store/index.html", """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#153a8a" />
    <meta name="description" content="BJ Electronics online store for trusted technology in Bangladesh." />
    <title>BJ Electronics — Online Store</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>
""")
write("apps/store/main.jsx", """
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../src/App.jsx";
import "../../src/styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
""")
write("apps/admin/index.html", """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b1f4b" />
    <meta name="robots" content="noindex,nofollow" />
    <title>BJ Admin — Operations</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>
""")
write("apps/admin/main.jsx", """
import React from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "../../src/AdminApp.jsx";
import "../../src/styles.css";
import "../../src/admin-styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
""")

vite_shared = """
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const resolve = (path) => fileURLToPath(new URL(path, import.meta.url));
"""
write("vite.store.config.mjs", vite_shared + """
export default defineConfig({
  root: resolve("./apps/store"),
  publicDir: resolve("./public"),
  build: {
    outDir: resolve("./dist/client"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["terminal.local"],
    proxy: { "/api": "http://localhost:4000" },
  },
  plugins: [react()],
});
""")
write("vite.admin.config.mjs", vite_shared + """
export default defineConfig({
  root: resolve("./apps/admin"),
  base: "/admin/",
  publicDir: resolve("./public"),
  build: {
    outDir: resolve("./dist/admin-client"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
    allowedHosts: ["terminal.local"],
    proxy: { "/api": "http://localhost:4000" },
  },
  plugins: [react()],
});
""")

write("scripts/prepare-production-build.mjs", """
#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const store = path.join(dist, "client", "index.html");
const adminSource = path.join(dist, "admin-client");
const adminIndex = path.join(adminSource, "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");

for (const file of [store, adminIndex, worker, hosting]) {
  if (!existsSync(file)) throw new Error(`Missing production build input: ${file}`);
}

const adminTarget = path.join(dist, "client", "admin");
rmSync(adminTarget, { recursive: true, force: true });
mkdirSync(adminTarget, { recursive: true });
cpSync(adminSource, adminTarget, { recursive: true });
rmSync(adminSource, { recursive: true, force: true });

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
cpSync(worker, path.join(dist, "server", "index.js"));
cpSync(hosting, path.join(dist, ".openai", "hosting.json"));

console.log("Prepared storefront, administrator portal, worker, and hosting metadata.");
""")

write("worker/index.js", """
const acceptsHtml = (request) => request.headers.get("accept")?.includes("text/html");
const isNavigation = (request) => ["GET", "HEAD"].includes(request.method) && acceptsHtml(request);
const isAdminSurface = (url) => url.hostname.startsWith("admin.") || url.pathname.startsWith("/admin");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isNavigation(request) && url.hostname.startsWith("admin.") && url.pathname === "/") {
      const adminUrl = new URL(request.url);
      adminUrl.pathname = "/admin/index.html";
      adminUrl.search = "";
      return env.ASSETS.fetch(new Request(adminUrl, request));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !isNavigation(request) || url.pathname.startsWith("/api/")) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = isAdminSurface(url) ? "/admin/index.html" : "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
""")

# Local domain navigation reflects independent development servers.
domain = read("src/domain-config.js")
domain = domain.replace(
    '  if (isLocalHost) return window.location.origin;\n  if (window.location.hostname.startsWith("admin.")) {',
    '  if (isLocalHost) return `${window.location.protocol}//${window.location.hostname}:5173`;\n  if (window.location.hostname.startsWith("admin.")) {',
    1,
)
domain = domain.replace(
    '  if (isLocalHost) return window.location.origin;\n  if (window.location.hostname.startsWith("www.")) {',
    '  if (isLocalHost) return `${window.location.protocol}//${window.location.hostname}:5174`;\n  if (window.location.hostname.startsWith("www.")) {',
    1,
)
write("src/domain-config.js", domain)

# Configuration no longer exposes payment provider credentials.
config = read("server/config.js")
config = config.replace('  adminUrl: origin("ADMIN_URL", "http://localhost:5173", { requiredInProduction: true }),', '  adminUrl: origin("ADMIN_URL", "http://localhost:5174", { requiredInProduction: true }),')
config = re.sub(r'\n  sslcommerz: \{[\s\S]*?\n  \},', '', config, count=1)
write("server/config.js", config)

# Repository: atomic offline order placement, stock locking, and cancellation restock.
repository = read("server/repository.js")
repository = repository.replace("  paymentProvider: row.payment_provider,", "  paymentMethod: row.payment_method,")
start = repository.find("  async createPendingOrder(")
end = repository.find("  async listOrdersForUser(", start)
if start < 0 or end < 0:
    raise RuntimeError("Could not locate legacy payment repository block.")
order_methods = '''  async placeOrder({ userId, items, customer, currency = "BDT", paymentMethod = "cash_on_delivery" }) {
    return withTransaction(async (connection) => {
      const productIds = [...new Set(items.map((item) => Number(item.productId)))];
      const placeholders = productIds.map(() => "?").join(",");
      const [rows] = await connection.execute(
        `SELECT * FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
        productIds,
      );
      const products = rows.map(mapProduct);
      const productMap = new Map(products.map((product) => [product.id, product]));
      let subtotal = 0;
      const lines = items.map((item) => {
        const product = productMap.get(Number(item.productId));
        const quantity = Number(item.quantity);
        if (!product || !product.active) throw Object.assign(new Error("One or more products are unavailable."), { status: 409 });
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw Object.assign(new Error("Invalid product quantity."), { status: 400 });
        if (product.stock < quantity) throw Object.assign(new Error(`${product.name} does not have enough stock.`), { status: 409 });
        const lineTotal = Number((product.price * quantity).toFixed(2));
        subtotal += lineTotal;
        return { product, quantity, lineTotal };
      });

      const shipping = currency === "BDT" ? (subtotal >= 5000 ? 0 : 120) : (subtotal >= 50 ? 0 : 9.99);
      const tax = currency === "BDT" ? 0 : Number((subtotal * 0.08).toFixed(2));
      const total = Number((subtotal + shipping + tax).toFixed(2));
      const id = crypto.randomUUID();
      const orderNumber = `BJ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const paymentStatus = paymentMethod === "bank_transfer" ? "awaiting_payment" : "pending";

      await connection.execute(
        `INSERT INTO orders
         (id, order_number, user_id, status, payment_status, payment_method, subtotal, shipping_amount, tax_amount, total_amount, currency, customer_name, customer_email, customer_phone, shipping_address)
         VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, orderNumber, userId, paymentStatus, paymentMethod, subtotal, shipping, tax, total, currency, customer.name, customer.email, customer.phone, customer.address],
      );

      for (const line of lines) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, line.product.id, line.product.name, line.product.sku, line.quantity, line.product.price, line.lineTotal],
        );
        const [stockUpdate] = await connection.execute(
          "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
          [line.quantity, line.product.id, line.quantity],
        );
        if (stockUpdate.affectedRows !== 1) throw Object.assign(new Error(`${line.product.name} stock changed during checkout.`), { status: 409 });
      }

      return {
        id, orderNumber, status: "confirmed", paymentStatus, paymentMethod,
        subtotal, shipping, tax, total, currency, customer, lines,
        createdAt: new Date().toISOString(),
      };
    });
  }

'''
repository = repository[:start] + order_methods + repository[end:]
repository = repository.replace("WHERE oi.product_id = ? AND o.user_id = ? AND o.payment_status = 'paid'", "WHERE oi.product_id = ? AND o.user_id = ? AND o.status IN ('processing', 'shipped', 'delivered')")
repository = repository.replace("COUNT(o.id) AS order_count, COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) AS lifetime_value", "COUNT(o.id) AS order_count, COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS lifetime_value")
old_update = '''  async updateOrderStatus(id, status) {
    await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    const [rows] = await pool.execute("SELECT * FROM orders WHERE id = ?", [id]);
    return rows[0] ? mapOrder(rows[0]) : null;
  }
'''
new_update = '''  async updateOrderStatus(id, status) {
    return withTransaction(async (connection) => {
      const [orders] = await connection.execute("SELECT * FROM orders WHERE id = ? FOR UPDATE", [id]);
      const current = orders[0];
      if (!current) return null;
      if (current.status === status) return mapOrder(current);

      const [items] = await connection.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [id]);
      if (status === "cancelled" && current.status !== "cancelled") {
        for (const item of items) {
          await connection.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
        }
      }
      if (current.status === "cancelled" && status !== "cancelled") {
        for (const item of items) {
          const [result] = await connection.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
            [item.quantity, item.product_id, item.quantity],
          );
          if (result.affectedRows !== 1) throw Object.assign(new Error("Order cannot be restored because inventory is unavailable."), { status: 409 });
        }
      }

      await connection.execute(
        "UPDATE orders SET status = ?, payment_status = CASE WHEN ? = 'cancelled' THEN 'cancelled' ELSE payment_status END WHERE id = ?",
        [status, status, id],
      );
      const [updated] = await connection.execute("SELECT * FROM orders WHERE id = ?", [id]);
      return mapOrder(updated[0]);
    });
  }
'''
if old_update not in repository:
    raise RuntimeError("Could not locate order status method.")
repository = repository.replace(old_update, new_update, 1)
write("server/repository.js", repository)

# Modular API composition.
write("server/http/validate.js", """
export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const error = new Error("Validation failed.");
  error.status = 400;
  error.details = result.error.flatten();
  throw error;
}
""")
write("server/http/error-handler.js", """
import { z } from "zod";

export function notFound(_req, res) {
  res.status(404).json({ error: "Route not found." });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || (error instanceof z.ZodError ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 ? "The server could not complete this request." : error.message,
    ...(error.details ? { details: error.details } : {}),
  });
}
""")
write("server/modules/shared/schemas.js", """
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(120).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20).optional(),
});

export const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(10),
  })).min(1).max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    phone: z.string().trim().min(7).max(20),
    address: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(60),
    state: z.string().trim().max(60).optional(),
    postcode: z.string().trim().min(3).max(20),
    country: z.string().trim().max(60).default("Bangladesh"),
  }),
  currency: z.enum(["BDT", "USD"]).default("BDT"),
  paymentMethod: z.enum(["cash_on_delivery", "bank_transfer"]).default("cash_on_delivery"),
});

export const productSchema = z.object({
  sku: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(140),
  category: z.string().trim().min(2).max(80),
  subcategory: z.string().trim().min(2).max(80).nullable().optional(),
  brand: z.string().trim().min(2).max(80).nullable().optional(),
  description: z.string().trim().min(5).max(1000),
  price: z.coerce.number().positive(),
  oldPrice: z.coerce.number().positive().nullable().optional(),
  currency: z.enum(["BDT", "USD"]).default("BDT"),
  stock: z.coerce.number().int().min(0),
  availability: z.enum(["in_stock", "preorder"]).default("in_stock"),
  image: z.string().trim().min(1).max(500),
  sourceName: z.string().trim().min(2).max(80).nullable().optional(),
  sourceUrl: z.string().url().max(500).nullable().optional(),
  active: z.coerce.boolean().default(true),
  featured: z.coerce.boolean().default(false),
});

export const addressSchema = z.object({
  label: z.string().trim().min(2).max(40),
  recipientName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  addressLine: z.string().trim().min(5).max(180),
  city: z.string().trim().min(2).max(60),
  postcode: z.string().trim().min(3).max(20),
  isDefault: z.coerce.boolean().default(false),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(32).transform((value) => value.toUpperCase()),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.coerce.number().positive(),
  minimumOrder: z.coerce.number().min(0).default(0),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.coerce.boolean().default(true),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(600),
});
""")
write("server/modules/auth/routes.js", """
import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  clearAdminSessionCookie,
  clearSessionCookie,
  createSession,
  requireAdmin,
  requireAuth,
  setAdminSessionCookie,
  setSessionCookie,
} from "../../auth.js";
import { parse } from "../../http/validate.js";
import { credentialsSchema, registerSchema } from "../shared/schemas.js";

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.created_at || user.createdAt,
});

export function createCustomerAuthRouter(repository) {
  const router = Router();
  router.post("/register", async (req, res) => {
    const data = parse(registerSchema, req.body);
    if (await repository.findUserByEmail(data.email)) return res.status(409).json({ error: "An account already uses this email." });
    const user = await repository.createUser({ ...data, passwordHash: await bcrypt.hash(data.password, 12) });
    setSessionCookie(res, createSession(user));
    return res.status(201).json({ user });
  });
  router.post("/login", async (req, res) => {
    const data = parse(credentialsSchema, req.body);
    const user = await repository.findUserByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    if (user.role === "admin") return res.status(403).json({ error: "Use the protected BJ Admin portal to sign in." });
    const result = safeUser(user);
    setSessionCookie(res, createSession(result));
    return res.json({ user: result });
  });
  router.post("/logout", (_req, res) => {
    clearSessionCookie(res);
    return res.status(204).end();
  });
  router.get("/me", requireAuth, async (req, res) => {
    const user = await repository.findUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ user });
  });
  return router;
}

export function createAdminAuthRouter(repository) {
  const router = Router();
  router.post("/login", async (req, res) => {
    const data = parse(credentialsSchema, req.body);
    const user = await repository.findUserByEmail(data.email);
    if (!user || user.role !== "admin" || !(await bcrypt.compare(data.password, user.password_hash))) return res.status(401).json({ error: "Administrator email or password is incorrect." });
    const result = safeUser(user);
    setAdminSessionCookie(res, createSession(result, "bj-electronics-admin"));
    return res.json({ user: result });
  });
  router.get("/me", requireAdmin, async (req, res) => {
    const user = await repository.findUserById(req.user.sub);
    if (!user || user.role !== "admin") return res.status(404).json({ error: "Administrator account not found." });
    return res.json({ user });
  });
  router.post("/logout", (_req, res) => {
    clearAdminSessionCookie(res);
    return res.status(204).end();
  });
  return router;
}
""")
write("server/modules/catalog/routes.js", """
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { reviewSchema } from "../shared/schemas.js";

export function createCatalogRouter(repository) {
  const router = Router();
  router.get("/", async (_req, res) => res.json({ products: await repository.listProducts() }));
  router.get("/:id/reviews", async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    return res.json({ reviews: await repository.listProductReviews(id) });
  });
  router.post("/:id/reviews", requireAuth, async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const review = await repository.createProductReview(id, req.user.sub, parse(reviewSchema, req.body));
    return res.status(201).json({ review });
  });
  return router;
}

export function createCouponValidationRouter(repository) {
  const router = Router();
  router.post("/validate", async (req, res) => {
    const data = parse(z.object({
      code: z.string().trim().min(3).max(32).transform((value) => value.toUpperCase()),
      subtotal: z.coerce.number().positive(),
    }), req.body);
    const coupon = await repository.validateCoupon(data.code, data.subtotal);
    if (!coupon) return res.status(404).json({ error: "Coupon is invalid, expired, or does not meet the minimum order." });
    return res.json({ coupon });
  });
  return router;
}
""")
write("server/modules/orders/routes.js", """
import { Router } from "express";
import { requireAuth } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { orderSchema } from "../shared/schemas.js";

export function createOrdersRouter(repository) {
  const router = Router();
  router.get("/", requireAuth, async (req, res) => res.json({ orders: await repository.listOrdersForUser(req.user.sub) }));
  router.post("/", requireAuth, async (req, res) => {
    const data = parse(orderSchema, req.body);
    const order = await repository.placeOrder({ userId: req.user.sub, ...data });
    return res.status(201).json({ order });
  });
  router.get("/:id", requireAuth, async (req, res) => {
    const order = await repository.getOrderForUser(req.params.id, req.user.sub);
    if (!order) return res.status(404).json({ error: "Order not found." });
    return res.json({ order });
  });
  return router;
}
""")
write("server/modules/account/routes.js", """
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { addressSchema } from "../shared/schemas.js";

export function createAccountRouter(repository) {
  const router = Router();
  router.use(requireAuth);
  router.get("/addresses", async (req, res) => res.json({ addresses: await repository.listAddresses(req.user.sub) }));
  router.post("/addresses", async (req, res) => res.status(201).json({ address: await repository.createAddress(req.user.sub, parse(addressSchema, req.body)) }));
  router.patch("/addresses/:id", async (req, res) => {
    const address = await repository.updateAddress(req.params.id, req.user.sub, parse(addressSchema.partial(), req.body));
    if (!address) return res.status(404).json({ error: "Address not found." });
    return res.json({ address });
  });
  router.delete("/addresses/:id", async (req, res) => {
    if (!(await repository.deleteAddress(req.params.id, req.user.sub))) return res.status(404).json({ error: "Address not found." });
    return res.status(204).end();
  });
  router.get("/wishlist", async (req, res) => res.json({ products: await repository.listWishlist(req.user.sub) }));
  router.post("/wishlist/:productId", async (req, res) => {
    const productId = parse(z.coerce.number().int().positive(), req.params.productId);
    return res.status(201).json({ added: await repository.addWishlistItem(req.user.sub, productId) });
  });
  router.delete("/wishlist/:productId", async (req, res) => {
    const productId = parse(z.coerce.number().int().positive(), req.params.productId);
    await repository.removeWishlistItem(req.user.sub, productId);
    return res.status(204).end();
  });
  return router;
}
""")
write("server/modules/admin/routes.js", """
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { couponSchema, productSchema } from "../shared/schemas.js";

export function createAdminRouter(repository) {
  const router = Router();
  router.use(requireAdmin);

  router.get("/products", async (_req, res) => res.json({ products: await repository.listProducts({ includeInactive: true }) }));
  router.post("/products", async (req, res) => res.status(201).json({ product: await repository.createProduct(parse(productSchema, req.body)) }));
  router.patch("/products/:id", async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const product = await repository.updateProduct(id, parse(productSchema.partial(), req.body));
    if (!product) return res.status(404).json({ error: "Product not found." });
    return res.json({ product });
  });

  router.get("/orders", async (_req, res) => res.json({ orders: await repository.listAllOrders() }));
  router.patch("/orders/:id/status", async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled"]) }), req.body);
    const order = await repository.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: "Order not found." });
    return res.json({ order });
  });

  router.get("/customers", async (_req, res) => res.json({ customers: await repository.listCustomers() }));
  router.get("/coupons", async (_req, res) => res.json({ coupons: await repository.listCoupons() }));
  router.post("/coupons", async (req, res) => res.status(201).json({ coupon: await repository.createCoupon(parse(couponSchema, req.body)) }));
  router.patch("/coupons/:id", async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const coupon = await repository.updateCoupon(id, parse(couponSchema.partial(), req.body));
    if (!coupon) return res.status(404).json({ error: "Coupon not found." });
    return res.json({ coupon });
  });
  return router;
}
""")
write("server/http/create-app.js", """
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { config } from "../config.js";
import { errorHandler, notFound } from "./error-handler.js";
import { createAccountRouter } from "../modules/account/routes.js";
import { createAdminRouter } from "../modules/admin/routes.js";
import { createAdminAuthRouter, createCustomerAuthRouter } from "../modules/auth/routes.js";
import { createCatalogRouter, createCouponValidationRouter } from "../modules/catalog/routes.js";
import { createOrdersRouter } from "../modules/orders/routes.js";

export function createApp({ repository, healthcheck = async () => true }) {
  const app = express();
  const allowedOrigins = new Set([config.storeUrl, config.adminUrl]);

  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(Object.assign(new Error("Origin is not allowed."), { status: 403 }));
    },
  }));
  app.use(express.json({ limit: "250kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    await healthcheck();
    return res.json({ status: "ok", service: "bj-electronics-api", checkout: "offline" });
  });
  app.use("/api/auth", createCustomerAuthRouter(repository));
  app.use("/api/admin/auth", createAdminAuthRouter(repository));
  app.use("/api/products", createCatalogRouter(repository));
  app.use("/api/orders", createOrdersRouter(repository));
  app.use("/api/account", createAccountRouter(repository));
  app.use("/api/coupons", createCouponValidationRouter(repository));
  app.use("/api/admin", createAdminRouter(repository));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
""")
write("server/app.js", 'export { createApp } from "./http/create-app.js";\n')
write("server/index.js", """
import { createApp } from "./app.js";
import { config } from "./config.js";
import { healthcheck } from "./db.js";
import { MySqlRepository } from "./repository.js";

const app = createApp({ repository: new MySqlRepository(), healthcheck });
app.listen(config.port, () => {
  console.log(`BJ Electronics API listening on port ${config.port}`);
});
""")

# Storefront checkout becomes gateway-free order placement.
app = read("src/App.jsx")
app = app.replace("  CreditCard,\n", "")
app = app.replace('[CreditCard, "Secure payment", "100% protected"]', '[ShoppingBag, "Flexible checkout", "Cash on delivery or bank transfer"]')
app = app.replace("Secure SSLCOMMERZ checkout", "Cash on delivery and bank transfer")
app = app.replace("Secure checkout via SSLCOMMERZ", "Order securely with offline payment options")
app = app.replace("Confirm your address, then continue to the SSLCOMMERZ hosted payment page.", "Confirm your delivery details and choose an available payment method.")
app = app.replace("<p>Secure checkout</p><h2>Delivery details</h2>", "<p>Order checkout</p><h2>Delivery details</h2>")
app = app.replace("See payment, processing and delivery progress.", "See confirmation, processing and delivery progress.")
app = app.replace('  const [checkoutBusy, setCheckoutBusy] = useState(false);', '  const [checkoutBusy, setCheckoutBusy] = useState(false);\n  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");')
complete_start = app.find("  const completeDemoOrder = () => {")
complete_end = app.find("  const beginCheckout = () => {", complete_start)
if complete_start < 0 or complete_end < 0:
    raise RuntimeError("Could not locate demo payment completion block.")
app = app[:complete_start] + app[complete_end:]
submit_start = app.find("  const submitCheckout = async (event) => {")
submit_end = app.find("  return (", submit_start)
if submit_start < 0 or submit_end < 0:
    raise RuntimeError("Could not locate checkout submission block.")
submit = '''  const submitCheckout = async (event) => {
    event.preventDefault();
    setCheckoutBusy(true);
    setCheckoutError("");
    try {
      const response = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: grouped.map((item) => ({ productId: item.id, quantity: item.qty })),
          customer: shipping,
          currency: "BDT",
          paymentMethod,
        }),
      });
      setPlacedOrder(response.order);
      setCheckoutState("confirmed");
      onOrderPlaced(response.order);
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setCheckoutBusy(false);
    }
  };
'''
app = app[:submit_start] + submit + app[submit_end:]
app = app.replace(
    '<div className="checkout-total wide"><span>Payable total</span><strong>{money(total)}</strong></div>',
    '<label className="wide"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash_on_delivery">Cash on delivery</option><option value="bank_transfer">Bank transfer</option></select></label><div className="checkout-total wide"><span>Order total</span><strong>{money(total)}</strong></div>',
)
app = app.replace('{checkoutBusy ? "Creating secure session…" : <><Lock weight="bold" /> Pay securely with SSLCOMMERZ</>}', '{checkoutBusy ? "Placing order…" : <><Lock weight="bold" /> Place order</>}')
app = re.sub(r'\n\s*\{checkoutError && <button type="button" className="demo-checkout wide"[\s\S]*?</button>\}', '', app, count=1)
app = app.replace('status: "processing",\n      paymentStatus: "paid",', 'status: "confirmed",\n      paymentStatus: "pending",\n      paymentMethod: "cash_on_delivery",')
write("src/App.jsx", app)

styles = read("src/styles.css")
styles = styles.replace(".checkout-form input {", ".checkout-form input, .checkout-form select {")
styles = styles.replace(".checkout-form input:focus {", ".checkout-form input:focus, .checkout-form select:focus {")
write("src/styles.css", styles)

# Administrator wording and data model no longer reference a gateway.
admin = read("src/AdminApp.jsx")
admin = admin.replace("payment readiness", "checkout operations")
admin = admin.replace('paymentStatus: "paid", total:', 'paymentStatus: "paid", paymentMethod: "cash_on_delivery", total:')
admin = admin.replace('paymentStatus: "unpaid", total:', 'paymentStatus: "awaiting_payment", paymentMethod: "bank_transfer", total:')
admin = admin.replace('<span><small>Payment</small><b className="paid">{selected.paymentStatus}</b></span>', '<span><small>Payment method</small><b>{(selected.paymentMethod || "cash_on_delivery").replaceAll("_", " ")}</b></span>')
admin = admin.replace('<article><div><span>Payment gateway</span><strong>Sandbox</strong><small><em>Credentials pending</em></small></div><i className="pending"><ShieldCheck /></i></article>', '<article><div><span>Checkout methods</span><strong>2 active</strong><small><b>COD</b> and bank transfer</small></div><i><ShieldCheck /></i></article>')
admin = admin.replace('<section className="ops-card"><header><div><p>Payments</p><h3>SSLCOMMERZ connection</h3></div><StatusPill value="pending" /></header><div className="ops-gateway-state"><ShieldCheck weight="duotone" /><h4>Sandbox credentials pending</h4><p>The integration is configured, but no merchant credentials are stored yet. Checkout remains in safe demo mode.</p><button className="ops-secondary">Configure later</button></div></section>', '<section className="ops-card"><header><div><p>Checkout policy</p><h3>Offline payment methods</h3></div><CheckCircle weight="fill" className="ops-ok" /></header><div className="ops-gateway-state"><ShieldCheck weight="duotone" /><h4>No external payment gateway</h4><p>Orders use cash on delivery or bank transfer. Inventory is reserved atomically when an order is confirmed.</p><button className="ops-secondary">Methods active</button></div></section>')
write("src/AdminApp.jsx", admin)

# Database is a first-class deployable layer.
schema = read("server/sql/schema.sql")
schema = schema.replace("status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending'", "status ENUM('confirmed', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'confirmed'")
schema = schema.replace("payment_status ENUM('unpaid', 'paid', 'failed', 'cancelled', 'invalid') NOT NULL DEFAULT 'unpaid'", "payment_status ENUM('pending', 'awaiting_payment', 'paid', 'refunded', 'cancelled') NOT NULL DEFAULT 'pending'")
schema = schema.replace("payment_provider VARCHAR(32) NOT NULL", "payment_method ENUM('cash_on_delivery', 'bank_transfer') NOT NULL DEFAULT 'cash_on_delivery'")
schema = re.sub(r'\nCREATE TABLE IF NOT EXISTS payments \([\s\S]*?\n\);\n', '\n', schema, count=1)
write("database/schema.sql", schema)

migrations_source = ROOT / "server/sql/migrations"
migrations_target = ROOT / "database/migrations"
migrations_target.mkdir(parents=True, exist_ok=True)
if migrations_source.exists():
    for source in migrations_source.iterdir():
        if source.is_file():
            shutil.copy2(source, migrations_target / source.name)
seed_source = ROOT / "server/sql/seed.sql"
if seed_source.exists():
    write("database/seeds/seed.sql", seed_source.read_text(encoding="utf-8"))
write("database/migrations/004_remove_online_payment_gateway.sql", """
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
""")
write("database/README.md", """
# Database

MySQL is the single source of truth for customer accounts, catalog data, inventory, orders, addresses, wishlists, reviews, and promotions.

## Commands

- `npm run db:migrate` applies the base schema and every numbered migration once.
- `npm run db:seed-users` creates explicitly configured administrator credentials and the optional local demo customer.
- `npm run db:seed-catalog` imports the organized catalog idempotently.

Production deployments must back up the database before migrations. The gateway-removal migration deletes the obsolete `payments` table and converts existing orders to the offline payment model.
""")
write("scripts/migrate.mjs", """
#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../server/config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connection = await mysql.createConnection({
  ...config.database,
  multipleStatements: true,
});

try {
  const schema = await readFile(path.join(root, "database", "schema.sql"), "utf8");
  await connection.query(schema);
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const migrationDir = path.join(root, "database", "migrations");
  const files = (await readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const name of files) {
    const [rows] = await connection.execute("SELECT 1 FROM schema_migrations WHERE name = ?", [name]);
    if (rows.length) continue;
    const sql = await readFile(path.join(migrationDir, name), "utf8");
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [name]);
      await connection.commit();
      console.log(`Applied migration: ${name}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
""")
if (ROOT / "server/sql").exists():
    shutil.rmtree(ROOT / "server/sql")

# Tests for modular API, separate builds, inventory integrity, and permanent gateway removal.
write("server/tests/api.test.mjs", """
import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../app.js";

const passwordHash = await bcrypt.hash("demo12345", 4);

function fixture() {
  const users = [
    { id: "customer-1", name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", password_hash: passwordHash, role: "customer" },
    { id: "admin-1", name: "Store Administrator", email: "admin@bjelectronics.shop", phone: "01700000001", password_hash: passwordHash, role: "admin" },
  ];
  const products = [{ id: 1, sku: "BJ-LAP-M2", name: "MacBook Air M2", category: "Laptops", description: "Premium laptop", price: 119999, currency: "BDT", stock: 8, image: "/assets/laptop.webp", active: true, featured: true }];
  const orders = [];
  const addresses = [];
  const wishlist = [];
  const reviews = [];
  const coupons = [{ id: 1, code: "WELCOME20", discountType: "percent", discountValue: 20, minimumOrder: 100, active: true }];
  const repository = {
    findUserByEmail: async (email) => users.find((user) => user.email === email) || null,
    findUserById: async (id) => users.find((user) => user.id === id) || null,
    createUser: async ({ name, email, phone, passwordHash: hash }) => {
      const user = { id: `user-${users.length + 1}`, name, email, phone, password_hash: hash, role: "customer" };
      users.push(user);
      return { id: user.id, name, email, phone, role: user.role };
    },
    listProducts: async () => products,
    placeOrder: async ({ userId, customer, currency, paymentMethod, items }) => {
      const order = { id: `order-${orders.length + 1}`, orderNumber: `BJ-${orders.length + 1}`, userId, customer, customerName: customer.name, currency, paymentMethod, paymentStatus: paymentMethod === "bank_transfer" ? "awaiting_payment" : "pending", status: "confirmed", total: 119999, items, createdAt: new Date().toISOString() };
      orders.push(order);
      return order;
    },
    listOrdersForUser: async (userId) => orders.filter((order) => order.userId === userId),
    getOrderForUser: async (id, userId) => orders.find((order) => order.id === id && order.userId === userId) || null,
    listAddresses: async () => addresses,
    createAddress: async (userId, data) => { const address = { id: `address-${addresses.length + 1}`, userId, ...data }; addresses.push(address); return address; },
    updateAddress: async () => null,
    deleteAddress: async () => false,
    listWishlist: async () => wishlist.map((id) => products.find((product) => product.id === id)),
    addWishlistItem: async (_userId, productId) => { wishlist.push(productId); return true; },
    removeWishlistItem: async (_userId, productId) => { const index = wishlist.indexOf(productId); if (index >= 0) wishlist.splice(index, 1); },
    listProductReviews: async () => reviews,
    createProductReview: async (productId, userId, data) => { const review = { id: `review-${reviews.length + 1}`, productId, userId, name: "BJ Customer", ...data, verifiedPurchase: false }; reviews.push(review); return review; },
    validateCoupon: async (code, subtotal) => code === "WELCOME20" && subtotal >= 100 ? coupons[0] : null,
    listAllOrders: async () => orders,
    updateOrderStatus: async (id, status) => { const order = orders.find((item) => item.id === id); if (!order) return null; order.status = status; return order; },
    listCustomers: async () => users.filter((user) => user.role === "customer"),
    listCoupons: async () => coupons,
    createCoupon: async (data) => ({ id: 2, ...data }),
    updateCoupon: async () => null,
    createProduct: async (data) => ({ id: 2, ...data }),
    updateProduct: async () => null,
  };
  return { app: createApp({ repository }), users, orders };
}

async function customerSession(app) {
  const response = await request(app).post("/api/auth/login").send({ email: "demo@bjelectronics.shop", password: "demo12345" }).expect(200);
  return response.headers["set-cookie"];
}

async function adminSession(app) {
  const response = await request(app).post("/api/admin/auth/login").send({ email: "admin@bjelectronics.shop", password: "demo12345" }).expect(200);
  return response.headers["set-cookie"];
}

test("reports healthy gateway-free API status", async () => {
  const { app } = fixture();
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.checkout, "offline");
});

test("registers and authenticates customers with an HTTP-only cookie", async () => {
  const { app, users } = fixture();
  const response = await request(app).post("/api/auth/register").send({ name: "New Customer", email: "new@example.com", phone: "01711111111", password: "strongpass1" }).expect(201);
  assert.match(response.headers["set-cookie"][0], /bj_session=/);
  assert.equal(users.length, 3);
});

test("keeps customer and administrator sessions isolated", async () => {
  const { app } = fixture();
  const cookie = await customerSession(app);
  await request(app).get("/api/admin/products").set("Cookie", cookie).expect(401);
  const adminCookie = await adminSession(app);
  await request(app).get("/api/admin/products").set("Cookie", adminCookie).expect(200);
});

test("places cash-on-delivery orders without an external payment session", async () => {
  const { app, orders } = fixture();
  const cookie = await customerSession(app);
  const response = await request(app).post("/api/orders").set("Cookie", cookie).send({
    items: [{ productId: 1, quantity: 1 }],
    currency: "BDT",
    paymentMethod: "cash_on_delivery",
    customer: { name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", address: "House 18, Road 7", city: "Dhaka", state: "Dhaka", postcode: "1209", country: "Bangladesh" },
  }).expect(201);
  assert.equal(response.body.order.status, "confirmed");
  assert.equal(response.body.order.paymentMethod, "cash_on_delivery");
  assert.equal(orders.length, 1);
});

test("supports bank-transfer order placement with awaiting-payment state", async () => {
  const { app } = fixture();
  const cookie = await customerSession(app);
  const response = await request(app).post("/api/orders").set("Cookie", cookie).send({
    items: [{ productId: 1, quantity: 1 }], paymentMethod: "bank_transfer",
    customer: { name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", address: "House 18, Road 7", city: "Dhaka", postcode: "1209" },
  }).expect(201);
  assert.equal(response.body.order.paymentStatus, "awaiting_payment");
});

test("serves catalog, account, review, coupon, and administrator workflows", async () => {
  const { app } = fixture();
  await request(app).get("/api/products").expect(200);
  await request(app).post("/api/coupons/validate").send({ code: "welcome20", subtotal: 200 }).expect(200);
  const cookie = await customerSession(app);
  await request(app).post("/api/account/addresses").set("Cookie", cookie).send({ label: "Home", recipientName: "BJ Customer", phone: "01700000000", addressLine: "House 18, Road 7", city: "Dhaka", postcode: "1209", isDefault: true }).expect(201);
  await request(app).post("/api/account/wishlist/1").set("Cookie", cookie).expect(201);
  await request(app).post("/api/products/1/reviews").set("Cookie", cookie).send({ rating: 5, title: "Excellent purchase", body: "Fast delivery and excellent product quality." }).expect(201);
  const adminCookie = await adminSession(app);
  await request(app).get("/api/admin/customers").set("Cookie", adminCookie).expect(200);
  await request(app).get("/api/admin/coupons").set("Cookie", adminCookie).expect(200);
});

test("returns structured validation and not-found responses", async () => {
  const { app } = fixture();
  await request(app).post("/api/orders").send({}).expect(401);
  await request(app).get("/api/does-not-exist").expect(404);
});
""")
write("server/tests/repository-contract.test.mjs", """
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("order placement locks inventory and uses guarded stock deductions", async () => {
  const source = await readFile(new URL("../repository.js", import.meta.url), "utf8");
  assert.match(source, /SELECT \* FROM products WHERE id IN \([^)]*\) FOR UPDATE/);
  assert.match(source, /UPDATE products SET stock = stock - \? WHERE id = \? AND stock >= \?/);
  assert.match(source, /stock changed during checkout/);
});

test("database and server contain no online gateway implementation", async () => {
  const files = [
    new URL("../repository.js", import.meta.url),
    new URL("../config.js", import.meta.url),
    new URL("../../database/schema.sql", import.meta.url),
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /ssl\s*commerz|sslcommerz|payment_provider|CREATE TABLE IF NOT EXISTS payments/i);
  }
});
""")
write("tests/sites-worker.test.mjs", """
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

function assets(calls) {
  return {
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      calls.push(path);
      const known = ["/index.html", "/admin/index.html", "/assets/app.js"];
      return new Response(known.includes(path) ? path : "missing", { status: known.includes(path) ? 200 : 404 });
    },
  };
}

test("serves existing static assets without fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://www.bjelectronics.shop/assets/app.js"), { ASSETS: assets(calls) });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("routes storefront navigation to the storefront shell", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://www.bjelectronics.shop/products/laptop", { headers: { accept: "text/html" } }), { ASSETS: assets(calls) });
  assert.equal(await response.text(), "/index.html");
  assert.deepEqual(calls, ["/products/laptop", "/index.html"]);
});

test("routes administrator hostname and paths to the separate admin shell", async () => {
  for (const url of ["https://admin.bjelectronics.shop/", "https://www.bjelectronics.shop/admin/dashboard"]) {
    const calls = [];
    const response = await worker.fetch(new Request(url, { headers: { accept: "text/html" } }), { ASSETS: assets(calls) });
    assert.equal(await response.text(), "/admin/index.html");
    assert.equal(calls.at(-1), "/admin/index.html");
  }
});

test("does not convert missing API or write requests into an app shell", async () => {
  for (const request of [
    new Request("https://www.bjelectronics.shop/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://www.bjelectronics.shop/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    const calls = [];
    const response = await worker.fetch(request, { ASSETS: assets(calls) });
    assert.equal(response.status, 404);
    assert.equal(calls.length, 1);
  }
});

test("emits separate production application shells and Sites metadata", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/client/admin/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
""")

# Documentation and cleanup.
write("ARCHITECTURE.md", """
# BJ Electronics production architecture

## Deployable applications

- `apps/store` — customer storefront on `www.bjelectronics.shop` or port `5173` locally.
- `apps/admin` — protected administrator portal on `admin.bjelectronics.shop` or port `5174` locally.
- `server` — Express API on port `4000`, organized by business module.
- `database` — MySQL schema, numbered migrations, and seed assets.

The storefront and administrator portal are compiled independently. Production packaging combines their immutable assets under `dist/client`, while the worker routes each hostname and route family to the correct application shell.

## Checkout model

No online payment gateway exists in this codebase. Customers place orders using cash on delivery or bank transfer. Product rows are locked during order placement, stock is deducted with guarded updates, and cancelled orders restore inventory transactionally.

## Quality controls

`npm run check` runs all API, repository-contract, worker-routing tests, both frontend production builds, and packaging verification. `npm run security:audit` blocks high-severity production dependency findings.
""")
write("README.md", """
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
""")

for path in [
    "server/payment-gateway.js",
    "server/tests/payment-gateway.test.mjs",
    "server/tests/payment-validation.test.mjs",
    "index.html",
    "src/main.jsx",
    "vite.config.mjs",
    "scripts/prepare-sites-build.mjs",
]:
    target = ROOT / path
    if target.exists():
        target.unlink()

# Remove obsolete payment wording from QA notes while preserving the document.
qa = ROOT / "design-qa.md"
if qa.exists():
    text = qa.read_text(encoding="utf-8")
    text = re.sub(r"SSLCOMMERZ", "offline checkout", text, flags=re.I)
    text = re.sub(r"payment gateway", "checkout workflow", text, flags=re.I)
    qa.write_text(text, encoding="utf-8")

# Permanent source-level guarantee: gateway names, credentials, routes, and provider fields must be gone.
for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts or "node_modules" in path.parts or path.name == Path(__file__).name:
        continue
    if path.suffix.lower() not in {".js", ".jsx", ".mjs", ".json", ".md", ".sql", ".yml", ".yaml", ".example", ".css", ".html"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    if re.search(r"ssl\s*commerz|sslcommerz|SSLCOMMERZ_|/api/payments/|payment_provider", text, flags=re.I):
        raise RuntimeError(f"Obsolete online gateway reference remains in {path.relative_to(ROOT)}")

print("Applied gateway removal and separated production application architecture.")
