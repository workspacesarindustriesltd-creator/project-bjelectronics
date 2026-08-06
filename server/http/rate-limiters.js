import { rateLimit } from "express-rate-limit";

const common = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler(req, res, _next, options) {
    res.status(options.statusCode).json({
      error: options.message?.error || "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: res.getHeader("Retry-After") || null,
      path: req.originalUrl.split("?", 1)[0],
    });
  },
};

function createLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    ...common,
    windowMs,
    limit,
    skipSuccessfulRequests,
    message: { error: message },
  });
}

export function createRateLimiters(overrides = {}) {
  const windowMs = overrides.windowMs ?? 15 * 60 * 1000;
  return {
    global: createLimiter({
      windowMs,
      limit: overrides.limit ?? 900,
      message: "Request limit reached. Please try again later.",
    }),
    authentication: createLimiter({
      windowMs,
      limit: overrides.authLimit ?? 12,
      skipSuccessfulRequests: true,
      message: "Too many authentication attempts. Wait before trying again.",
    }),
    adminRead: createLimiter({
      windowMs,
      limit: overrides.adminReadLimit ?? 420,
      message: "Administrator request limit reached. Please retry shortly.",
    }),
    adminWrite: createLimiter({
      windowMs,
      limit: overrides.adminWriteLimit ?? 120,
      message: "Administrator write limit reached. Review pending actions before retrying.",
    }),
    uploads: createLimiter({
      windowMs,
      limit: overrides.uploadLimit ?? 60,
      message: "Upload request limit reached. Wait before uploading more files.",
    }),
  };
}

export function mutationOnly(limiter) {
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    return limiter(req, res, next);
  };
}
