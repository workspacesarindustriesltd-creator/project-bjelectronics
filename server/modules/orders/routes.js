
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
