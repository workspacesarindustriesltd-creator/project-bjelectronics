import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "./config.js";
import { clearAdminSessionCookie, clearSessionCookie, createSession, requireAdmin, requireAuth, setAdminSessionCookie, setSessionCookie } from "./auth.js";

const credentialsSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
});
const registerSchema = credentialsSchema.extend({
  name: z.string().min(2).max(80),
  phone: z.string().min(7).max(20).optional(),
});
const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.coerce.number().int().positive(), quantity: z.coerce.number().int().min(1).max(10) })).min(1),
  customer: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email().max(50),
    phone: z.string().min(7).max(20),
    address: z.string().min(5).max(200),
    city: z.string().min(2).max(50),
    state: z.string().max(50).optional(),
    postcode: z.string().min(3).max(20),
    country: z.string().max(50).default("Bangladesh"),
  }),
  currency: z.enum(["USD", "BDT"]).default("BDT"),
});
const productSchema = z.object({
  sku: z.string().min(2).max(64),
  name: z.string().min(2).max(140),
  category: z.string().min(2).max(80),
  subcategory: z.string().min(2).max(80).nullable().optional(),
  brand: z.string().min(2).max(80).nullable().optional(),
  description: z.string().min(5).max(1000),
  price: z.coerce.number().positive(),
  oldPrice: z.coerce.number().positive().nullable().optional(),
  currency: z.enum(["USD", "BDT"]).default("BDT"),
  stock: z.coerce.number().int().min(0),
  availability: z.enum(["in_stock", "preorder"]).default("in_stock"),
  image: z.string().min(1).max(500),
  sourceName: z.string().min(2).max(80).nullable().optional(),
  sourceUrl: z.string().url().max(500).nullable().optional(),
  active: z.coerce.boolean().default(true),
  featured: z.coerce.boolean().default(false),
});
const addressSchema = z.object({
  label: z.string().min(2).max(40),
  recipientName: z.string().min(2).max(80),
  phone: z.string().min(7).max(20),
  addressLine: z.string().min(5).max(180),
  city: z.string().min(2).max(60),
  postcode: z.string().min(3).max(20),
  isDefault: z.coerce.boolean().default(false),
});
const couponSchema = z.object({
  code: z.string().min(3).max(32).transform((value) => value.toUpperCase()),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.coerce.number().positive(),
  minimumOrder: z.coerce.number().min(0).default(0),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.coerce.boolean().default(true),
});
const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(600),
});

const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error("Validation failed.");
    error.status = 400;
    error.details = result.error.flatten();
    throw error;
  }
  return result.data;
};

export function createApp({ repository, paymentGateway, healthcheck = async () => true }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const allowedOrigins = new Set([config.storeUrl, config.adminUrl]);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed."));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "250kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    await healthcheck();
    res.json({ status: "ok", service: "bj-electronics-api" });
  });

  app.post("/api/auth/register", async (req, res) => {
    const data = parse(registerSchema, req.body);
    if (await repository.findUserByEmail(data.email)) return res.status(409).json({ error: "An account already uses this email." });
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await repository.createUser({ ...data, passwordHash });
    setSessionCookie(res, createSession(user));
    res.status(201).json({ user });
  });

  app.post("/api/auth/login", async (req, res) => {
    const data = parse(credentialsSchema, req.body);
    const user = await repository.findUserByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (user.role === "admin") return res.status(403).json({ error: "Use the protected BJ Admin portal to sign in." });
    const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, created_at: user.created_at };
    setSessionCookie(res, createSession(safeUser));
    res.json({ user: safeUser });
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.status(204).end();
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await repository.findUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: "Account not found." });
    res.json({ user });
  });

  app.post("/api/admin/auth/login", async (req, res) => {
    const data = parse(credentialsSchema, req.body);
    const user = await repository.findUserByEmail(data.email);
    if (!user || user.role !== "admin" || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ error: "Administrator email or password is incorrect." });
    }
    const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, created_at: user.created_at };
    setAdminSessionCookie(res, createSession(safeUser, "bj-electronics-admin"));
    res.json({ user: safeUser });
  });
  app.get("/api/admin/auth/me", requireAdmin, async (req, res) => {
    const user = await repository.findUserById(req.user.sub);
    if (!user || user.role !== "admin") return res.status(404).json({ error: "Administrator account not found." });
    res.json({ user });
  });
  app.post("/api/admin/auth/logout", (_req, res) => {
    clearAdminSessionCookie(res);
    res.status(204).end();
  });

  app.get("/api/products", async (_req, res) => {
    res.json({ products: await repository.listProducts() });
  });
  app.get("/api/products/:id/reviews", async (req, res) => {
    res.json({ reviews: await repository.listProductReviews(Number(req.params.id)) });
  });
  app.post("/api/products/:id/reviews", requireAuth, async (req, res) => {
    const review = await repository.createProductReview(Number(req.params.id), req.user.sub, parse(reviewSchema, req.body));
    res.status(201).json({ review });
  });

  app.get("/api/orders", requireAuth, async (req, res) => {
    res.json({ orders: await repository.listOrdersForUser(req.user.sub) });
  });
  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await repository.getOrderForUser(req.params.id, req.user.sub);
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json({ order });
  });

  app.get("/api/account/addresses", requireAuth, async (req, res) => {
    res.json({ addresses: await repository.listAddresses(req.user.sub) });
  });
  app.post("/api/account/addresses", requireAuth, async (req, res) => {
    res.status(201).json({ address: await repository.createAddress(req.user.sub, parse(addressSchema, req.body)) });
  });
  app.patch("/api/account/addresses/:id", requireAuth, async (req, res) => {
    const address = await repository.updateAddress(req.params.id, req.user.sub, addressSchema.partial().parse(req.body));
    if (!address) return res.status(404).json({ error: "Address not found." });
    res.json({ address });
  });
  app.delete("/api/account/addresses/:id", requireAuth, async (req, res) => {
    const removed = await repository.deleteAddress(req.params.id, req.user.sub);
    if (!removed) return res.status(404).json({ error: "Address not found." });
    res.status(204).end();
  });

  app.get("/api/account/wishlist", requireAuth, async (req, res) => {
    res.json({ products: await repository.listWishlist(req.user.sub) });
  });
  app.post("/api/account/wishlist/:productId", requireAuth, async (req, res) => {
    res.status(201).json({ added: await repository.addWishlistItem(req.user.sub, Number(req.params.productId)) });
  });
  app.delete("/api/account/wishlist/:productId", requireAuth, async (req, res) => {
    await repository.removeWishlistItem(req.user.sub, Number(req.params.productId));
    res.status(204).end();
  });

  app.post("/api/coupons/validate", async (req, res) => {
    const { code, subtotal } = z.object({
      code: z.string().min(3).max(32).transform((value) => value.toUpperCase()),
      subtotal: z.coerce.number().positive(),
    }).parse(req.body);
    const coupon = await repository.validateCoupon(code, subtotal);
    if (!coupon) return res.status(404).json({ error: "Coupon is invalid, expired, or does not meet the minimum order." });
    res.json({ coupon });
  });

  app.post("/api/payments/sslcommerz/initiate", requireAuth, async (req, res) => {
    const data = parse(checkoutSchema, req.body);
    const order = await repository.createPendingOrder({ userId: req.user.sub, ...data });
    const session = await paymentGateway.initiate(order);
    await repository.attachPaymentSession(order.id, session);
    res.status(201).json({
      order: { id: order.id, orderNumber: order.orderNumber, total: order.total, currency: order.currency },
      paymentUrl: session.gatewayUrl,
      sandbox: !paymentGateway.settings.isLive,
    });
  });

  const validatePayment = async (req, res, { redirect = false } = {}) => {
    const validationId = req.body.val_id;
    const transactionId = req.body.tran_id;
    if (!validationId || !transactionId) {
      if (redirect) return res.redirect(`${config.storeUrl}/?payment=failed`);
      return res.status(400).json({ error: "Missing payment validation data." });
    }
    const expected = await repository.findOrderForPayment(transactionId);
    if (!expected) return res.status(404).json({ error: "Payment order not found." });
    const validation = await paymentGateway.validate(validationId);
    const validStatus = ["VALID", "VALIDATED"].includes(validation.status);
    const transactionMatches = validation.tran_id === transactionId;
    const amountMatches = Math.abs(Number(validation.amount) - Number(expected.total_amount)) < 0.01;
    const currencyMatches = validation.currency === expected.currency;
    if (!validStatus || !transactionMatches || !amountMatches || !currencyMatches) {
      await repository.markPaymentFailed(transactionId, "invalid");
      if (redirect) return res.redirect(`${config.storeUrl}/?payment=failed`);
      return res.status(422).json({ error: "Payment validation failed." });
    }
    await repository.completePayment({
      transactionId,
      validationId,
      bankTransactionId: validation.bank_tran_id,
      gateway: validation.card_issuer,
      riskLevel: Number(validation.risk_level || 0),
      raw: validation,
    });
    if (redirect) return res.redirect(`${config.storeUrl}/?payment=success&order=${expected.order_number}`);
    return res.json({ received: true });
  };

  app.post("/api/payments/sslcommerz/ipn", (req, res, next) => validatePayment(req, res).catch(next));
  app.post("/api/payments/sslcommerz/success", (req, res, next) => validatePayment(req, res, { redirect: true }).catch(next));
  app.post("/api/payments/sslcommerz/fail", async (req, res) => {
    if (req.body.tran_id) await repository.markPaymentFailed(req.body.tran_id, "failed");
    res.redirect(`${config.storeUrl}/?payment=failed`);
  });
  app.post("/api/payments/sslcommerz/cancel", async (req, res) => {
    if (req.body.tran_id) await repository.markPaymentFailed(req.body.tran_id, "cancelled");
    res.redirect(`${config.storeUrl}/?payment=cancelled`);
  });

  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    res.json({ products: await repository.listProducts({ includeInactive: true }) });
  });
  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    res.status(201).json({ product: await repository.createProduct(parse(productSchema, req.body)) });
  });
  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    const product = await repository.updateProduct(Number(req.params.id), data);
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json({ product });
  });
  app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
    res.json({ orders: await repository.listAllOrders() });
  });
  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    const { status } = z.object({ status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]) }).parse(req.body);
    const order = await repository.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json({ order });
  });
  app.get("/api/admin/customers", requireAdmin, async (_req, res) => {
    res.json({ customers: await repository.listCustomers() });
  });
  app.get("/api/admin/coupons", requireAdmin, async (_req, res) => {
    res.json({ coupons: await repository.listCoupons() });
  });
  app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
    res.status(201).json({ coupon: await repository.createCoupon(parse(couponSchema, req.body)) });
  });
  app.patch("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    const coupon = await repository.updateCoupon(Number(req.params.id), couponSchema.partial().parse(req.body));
    if (!coupon) return res.status(404).json({ error: "Coupon not found." });
    res.json({ coupon });
  });

  app.use((error, _req, res, _next) => {
    const status = error.status || (error instanceof z.ZodError ? 400 : 500);
    if (status >= 500) console.error(error);
    res.status(status).json({
      error: status >= 500 ? "The server could not complete this request." : error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  });
  return app;
}
