
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
