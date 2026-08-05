import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { couponSchema, productSchema } from "../shared/schemas.js";
import { createCatalogOperationsRouter } from "./catalog-operations.js";

const CATALOG_CACHE_KEYS = ["catalog:products:active"];
const permitted = (authorization, code) => !authorization || authorization.permissions.includes("*") || authorization.permissions.includes(code);

function allow(code) {
  return (req, res, next) => permitted(req.adminAuthorization, code)
    ? next()
    : res.status(403).json({ error: "Your administrator role does not allow this action.", code: "ADMIN_PERMISSION_DENIED" });
}

function audit(controlRepository, req, action, entityType, entityId, metadata = {}) {
  return controlRepository?.audit?.({
    actorUserId: req.user.sub,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: req.ip || null,
    userAgent: req.get("user-agent") || null,
  });
}

export function createAdminRouter(repository, { cache, media, controlRepository } = {}) {
  const router = Router();
  router.use(requireAdmin);
  router.use(async (req, _res, next) => {
    if (!controlRepository) return next();
    try {
      req.adminAuthorization = await controlRepository.getAuthorization(req.user.sub);
      return next();
    } catch (error) {
      return next(error);
    }
  });

  router.get("/integrations", allow("dashboard.read"), async (_req, res) => res.json({
    redis: await cache?.health?.() || { status: "disabled" },
    cloudinary: await media?.health?.() || { status: "disabled" },
  }));

  router.get("/media/signature", allow("media.manage"), async (req, res) => {
    if (!media?.createUploadSignature) {
      throw Object.assign(new Error("Cloudinary media storage is not configured."), { status: 503 });
    }
    const resourceType = parse(
      z.enum(["image", "video"]).default("image"),
      req.query.resourceType || "image",
    );
    return res.json(await media.createUploadSignature({ resourceType }));
  });

  router.use("/catalog", allow("catalog.import"), createCatalogOperationsRouter({ cache }));

  router.get("/products", allow("catalog.read"), async (_req, res) => res.json({ products: await repository.listProducts({ includeInactive: true }) }));
  router.post("/products", allow("catalog.write"), async (req, res) => {
    const product = await repository.createProduct(parse(productSchema, req.body));
    await cache?.deleteMany?.(CATALOG_CACHE_KEYS);
    await audit(controlRepository, req, "product.create", "product", product.id, { sku: product.sku });
    return res.status(201).json({ product });
  });
  router.patch("/products/:id", allow("catalog.write"), async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const data = parse(productSchema.partial(), req.body);
    const product = await repository.updateProduct(id, data);
    if (!product) return res.status(404).json({ error: "Product not found." });
    await cache?.deleteMany?.(CATALOG_CACHE_KEYS);
    await audit(controlRepository, req, "product.update", "product", id, { fields: Object.keys(data), sku: product.sku });
    return res.json({ product });
  });

  router.get("/orders", allow("orders.read"), async (_req, res) => res.json({ orders: await repository.listAllOrders() }));
  router.patch("/orders/:id/status", allow("orders.write"), async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled"]) }), req.body);
    const order = await repository.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: "Order not found." });
    await audit(controlRepository, req, "order.status.update", "order", order.id, { status });
    return res.json({ order });
  });

  router.get("/customers", allow("customers.read"), async (_req, res) => res.json({ customers: await repository.listCustomers() }));
  router.get("/coupons", allow("promotions.manage"), async (_req, res) => res.json({ coupons: await repository.listCoupons() }));
  router.post("/coupons", allow("promotions.manage"), async (req, res) => {
    const coupon = await repository.createCoupon(parse(couponSchema, req.body));
    await audit(controlRepository, req, "coupon.create", "coupon", coupon.id, { code: coupon.code });
    return res.status(201).json({ coupon });
  });
  router.patch("/coupons/:id", allow("promotions.manage"), async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const data = parse(couponSchema.partial(), req.body);
    const coupon = await repository.updateCoupon(id, data);
    if (!coupon) return res.status(404).json({ error: "Coupon not found." });
    await audit(controlRepository, req, "coupon.update", "coupon", id, { fields: Object.keys(data), code: coupon.code });
    return res.json({ coupon });
  });
  return router;
}
