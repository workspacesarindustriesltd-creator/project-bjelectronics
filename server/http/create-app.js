import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit as createRateLimit } from "express-rate-limit";
import { requireAdminPage } from "../auth.js";
import { config, isProduction } from "../config.js";
import { csrfProtection, issueCsrfToken } from "./csrf.js";
import { errorHandler, notFound } from "./error-handler.js";
import { createAccountRouter } from "../modules/account/routes.js";
import { createAdminRouter } from "../modules/admin/routes.js";
import { createAdminAuthRouter, createCustomerAuthRouter } from "../modules/auth/routes.js";
import { createCatalogRouter, createCouponValidationRouter } from "../modules/catalog/routes.js";
import { createOrdersRouter } from "../modules/orders/routes.js";

const ADMIN_PUBLIC_PAGES = new Set([
  "/admin/",
  "/admin/login",
  "/admin/login/",
]);

function requestPath(req) {
  return req.originalUrl.split("?", 1)[0];
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isHtmlNavigation(req) {
  return ["GET", "HEAD"].includes(req.method)
    && Boolean(req.accepts("html"));
}

function hasFileExtension(pathname) {
  return Boolean(path.posix.extname(pathname));
}

function setPrivateResponseHeaders(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
}

function isHashedAsset(filePath) {
  return /[.-][A-Za-z0-9_-]{8,}\.(?:css|js|mjs|png|jpe?g|webp|avif|svg|woff2?)$/i.test(filePath);
}

function mountStaticApplications(app, staticRoot) {
  app.get("/admin", (req, res, next) => {
    if (requestPath(req) !== "/admin") return next();
    return res.redirect(308, "/admin/");
  });

  app.use("/admin", (req, res, next) => {
    const pathname = requestPath(req);
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

    if (pathname === "/admin/index.html") {
      return res.redirect(308, "/admin/");
    }

    const protectedNavigation = isHtmlNavigation(req)
      && !hasFileExtension(pathname)
      && !ADMIN_PUBLIC_PAGES.has(pathname);

    if (protectedNavigation) return requireAdminPage(req, res, next);
    return next();
  });

  app.use(express.static(staticRoot, {
    index: false,
    fallthrough: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        if (filePath.includes(`${path.sep}admin${path.sep}`)) {
          setPrivateResponseHeaders(res);
        } else {
          res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
        }
        return;
      }

      if (isHashedAsset(filePath) && isProduction) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }

      res.setHeader(
        "Cache-Control",
        isProduction
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "no-cache",
      );
    },
  }));

  app.use((req, res, next) => {
    const pathname = requestPath(req);
    if (!isHtmlNavigation(req) || isApiPath(pathname)) return next();

    const isAdminNavigation = pathname.startsWith("/admin/");
    const entryFile = isAdminNavigation ? "admin/index.html" : "index.html";

    if (isAdminNavigation) setPrivateResponseHeaders(res);
    else res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");

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
  cache = null,
  media = null,
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
  app.use("/api", (_req, res, next) => {
    setPrivateResponseHeaders(res);
    return next();
  });
  app.get("/api/csrf-token", issueCsrfToken);
  app.use(csrfProtection);

  app.get("/api", (_req, res) => res.json({
    status: "ok",
    service: "bj-electronics-api",
    health: "/api/health",
  }));
  app.get("/api/health", async (_req, res) => {
    await healthcheck();
    const [redis, cloudinary] = await Promise.all([
      cache?.health?.() || { status: "disabled" },
      media?.health?.() || { status: "disabled" },
    ]);
    const status = redis.status === "degraded" ? "degraded" : "ok";
    return res.json({
      status,
      service: "bj-electronics-api",
      checkout: "offline",
      dependencies: {
        database: { status: "ok" },
        redis,
        cloudinary,
      },
    });
  });
  app.use("/api/auth", authenticationLimiter, createCustomerAuthRouter(repository));
  app.use("/api/admin/auth", authenticationLimiter, createAdminAuthRouter(repository));
  app.use("/api/products", createCatalogRouter(repository, {
    cache,
    catalogTtlSeconds: config.redis.catalogTtlSeconds,
    reviewTtlSeconds: config.redis.reviewTtlSeconds,
  }));
  app.use("/api/orders", createOrdersRouter(repository));
  app.use("/api/account", createAccountRouter(repository));
  app.use("/api/coupons", createCouponValidationRouter(repository));
  app.use("/api/admin", createAdminRouter(repository, { cache, media }));

  if (staticRoot) mountStaticApplications(app, staticRoot);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
