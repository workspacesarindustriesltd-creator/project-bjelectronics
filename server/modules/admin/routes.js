import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { couponSchema, productSchema } from "../shared/schemas.js";

const CATALOG_CACHE_KEYS = ["catalog:products:active"];

export function createAdminRouter(repository, { cache, media } = {}) {
  const router = Router();
  router.use(requireAdmin);

  router.get("/integrations", async (_req, res) => res.json({
    redis: await cache?.health?.() || { status: "disabled" },
    cloudinary: await media?.health?.() || { status: "disabled" },
  }));

  router.get("/media/signature", (req, res) => {
    const resourceType = parse(
      z.enum(["image", "video"]).default("image"),
      req.query.resourceType || "image",
    );
    return res.json(media?.createUploadSignature({ resourceType }));
  });

  router.get("/products", async (_req, res) => res.json({ products: await repository.listProducts({ includeInactive: true }) }));
  router.post("/products", async (req, res) => {
    const product = await repository.createProduct(parse(productSchema, req.body));
    await cache?.deleteMany?.(CATALOG_CACHE_KEYS);
    return res.status(201).json({ product });
  });
  router.patch("/products/:id", async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const product = await repository.updateProduct(id, parse(productSchema.partial(), req.body));
    if (!product) return res.status(404).json({ error: "Product not found." });
    await cache?.deleteMany?.(CATALOG_CACHE_KEYS);
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
