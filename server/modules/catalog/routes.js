import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { reviewSchema } from "../shared/schemas.js";

async function cached(cache, key, loader, ttlSeconds) {
  if (!cache?.enabled) return { value: await loader(), status: "BYPASS" };
  return cache.remember(key, loader, { ttlSeconds });
}

export function createCatalogRouter(repository, {
  cache,
  catalogTtlSeconds = 300,
  reviewTtlSeconds = 60,
} = {}) {
  const router = Router();
  router.get("/", async (_req, res) => {
    const result = await cached(
      cache,
      "catalog:products:active",
      () => repository.listProducts(),
      catalogTtlSeconds,
    );
    res.setHeader("X-Cache", result.status);
    return res.json({ products: result.value });
  });
  router.get("/:id/reviews", async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const result = await cached(
      cache,
      `catalog:product:${id}:reviews`,
      () => repository.listProductReviews(id),
      reviewTtlSeconds,
    );
    res.setHeader("X-Cache", result.status);
    return res.json({ reviews: result.value });
  });
  router.post("/:id/reviews", requireAuth, async (req, res) => {
    const id = parse(z.coerce.number().int().positive(), req.params.id);
    const review = await repository.createProductReview(id, req.user.sub, parse(reviewSchema, req.body));
    await cache?.delete?.(`catalog:product:${id}:reviews`);
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
