
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
