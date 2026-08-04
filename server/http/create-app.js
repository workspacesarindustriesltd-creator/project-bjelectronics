import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit as createRateLimit } from "express-rate-limit";
import { config, isProduction } from "../config.js";
import { csrfProtection, issueCsrfToken } from "./csrf.js";
import { errorHandler, notFound } from "./error-handler.js";
import { createAccountRouter } from "../modules/account/routes.js";
import { createAdminRouter } from "../modules/admin/routes.js";
import { createAdminAuthRouter, createCustomerAuthRouter } from "../modules/auth/routes.js";
import { createCatalogRouter, createCouponValidationRouter } from "../modules/catalog/routes.js";
import { createOrdersRouter } from "../modules/orders/routes.js";

function mountStaticApplications(app, staticRoot) {
  app.get("/admin", (req, res, next) => {
    if (req.path !== "/admin") return next();
    return res.redirect(308, "/admin/");
  });

  app.use(express.static(staticRoot, {
    index: false,
    fallthrough: true,
    setHeaders(res, filePath) {
      const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
      res.setHeader(
        "Cache-Control",
        isHashedAsset && isProduction
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
    },
  }));

  app.use((req, res, next) => {
    const acceptsHtml = req.accepts("html");
    const isNavigation = ["GET", "HEAD"].includes(req.method) && acceptsHtml;
    if (!isNavigation || req.path.startsWith("/api/")) return next();

    const entryFile = req.path.startsWith("/admin/")
      ? "admin/index.html"
      : "index.html";

    return res.sendFile(entryFile, { root: staticRoot }, (error) => {
      if (error) next(error);
    });
  });
}

export function createApp({
  repository,
  healthcheck = async () => true,
  staticRoot = null,
  rateLimit = {},
}) {
  const app = express();
  const allowedOrigins = new Set([config.storeUrl, config.adminUrl]);
  const requestLimiter = createRateLimit({
    windowMs: rateLimit.windowMs ?? 15 * 60 * 1000,
    limit: rateLimit.limit ?? 600,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });
  const authenticationLimiter = createRateLimit({
    windowMs: rateLimit.windowMs ?? 15 * 60 * 1000,
    limit: rateLimit.authLimit ?? 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please try again later." },
  });

  app.disable("x-powered-by");
  if (isProduction) app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(requestLimiter);
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
  app.get("/api/csrf-token", issueCsrfToken);
  app.use(csrfProtection);

  app.get("/api/health", async (_req, res) => {
    await healthcheck();
    return res.json({ status: "ok", service: "bj-electronics-api", checkout: "offline" });
  });
  app.use("/api/auth", authenticationLimiter, createCustomerAuthRouter(repository));
  app.use("/api/admin/auth", authenticationLimiter, createAdminAuthRouter(repository));
  app.use("/api/products", createCatalogRouter(repository));
  app.use("/api/orders", createOrdersRouter(repository));
  app.use("/api/account", createAccountRouter(repository));
  app.use("/api/coupons", createCouponValidationRouter(repository));
  app.use("/api/admin", createAdminRouter(repository));

  if (staticRoot) mountStaticApplications(app, staticRoot);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
