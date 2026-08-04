
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
