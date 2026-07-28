import jwt from "jsonwebtoken";
import { config, isProduction } from "./config.js";

const COOKIE_NAME = "bj_session";
const ADMIN_COOKIE_NAME = "bj_admin_session";

export function createSession(user, audience = "bj-electronics-web") {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: "8h", issuer: "bj-electronics-api", audience },
  );
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", ...(config.cookieDomain ? { domain: config.cookieDomain } : {}) });
}

export function setAdminSessionCookie(res, token) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
}

export function clearAdminSessionCookie(res) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
}

export function requireAuth(req, res, next) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.[COOKIE_NAME] || bearer;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = jwt.verify(token, config.jwtSecret, {
      issuer: "bj-electronics-api",
      audience: "bj-electronics-web",
    });
    return next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid or expired." });
  }
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Administrator authentication required." });
  try {
    req.user = jwt.verify(token, config.jwtSecret, {
      issuer: "bj-electronics-api",
      audience: "bj-electronics-admin",
    });
    if (req.user.role !== "admin") return res.status(403).json({ error: "Administrator access required." });
    return next();
  } catch {
    return res.status(401).json({ error: "Your administrator session is invalid or expired." });
  }
}
