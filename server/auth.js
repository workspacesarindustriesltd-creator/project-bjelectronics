import jwt from "jsonwebtoken";
import { config, isProduction } from "./config.js";

const COOKIE_NAME = "bj_session";
const ADMIN_COOKIE_NAME = "bj_admin_session";
const ISSUER = "bj-electronics-api";
const CUSTOMER_AUDIENCE = "bj-electronics-web";
const ADMIN_AUDIENCE = "bj-electronics-admin";

function cookieOptions(sameSite) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/",
    priority: "high",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}

function verifySession(token, audience) {
  return jwt.verify(token, config.jwtSecret, { issuer: ISSUER, audience });
}

function bearerToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
}

export function createSession(user, audience = CUSTOMER_AUDIENCE, expiresIn = "8h") {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn, issuer: ISSUER, audience },
  );
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions("lax"),
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions("lax"));
}

export function setAdminSessionCookie(res, token) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    ...cookieOptions("strict"),
    maxAge: 2 * 60 * 60 * 1000,
  });
}

export function clearAdminSessionCookie(res) {
  res.clearCookie(ADMIN_COOKIE_NAME, cookieOptions("strict"));
}

export function getAdminSession(req) {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) return null;
  try {
    const session = verifySession(token, ADMIN_AUDIENCE);
    return session.role === "admin" ? session : null;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || bearerToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = verifySession(token, CUSTOMER_AUDIENCE);
    return next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid or expired." });
  }
}

export function requireAdmin(req, res, next) {
  const session = getAdminSession(req);
  if (!session) return res.status(401).json({ error: "Administrator authentication required." });
  req.user = session;
  return next();
}

export function requireAdminPage(req, res, next) {
  const session = getAdminSession(req);
  if (session) {
    req.user = session;
    return next();
  }

  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  const returnTo = encodeURIComponent(req.originalUrl || "/admin/");
  return res.redirect(303, `/admin/login?returnTo=${returnTo}`);
}
