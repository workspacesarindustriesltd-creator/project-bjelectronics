
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
