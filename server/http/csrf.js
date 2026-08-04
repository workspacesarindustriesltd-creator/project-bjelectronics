import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config, isProduction } from "../config.js";

const CSRF_COOKIE_NAME = "bj_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  maxAge: 8 * 60 * 60 * 1000,
  path: "/",
  ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
};

function signToken(token) {
  return createHmac("sha256", config.jwtSecret).update(token).digest("base64url");
}

function signedTokenIsValid(signedToken) {
  if (typeof signedToken !== "string") return false;
  const separator = signedToken.lastIndexOf(".");
  if (separator < 1) return false;

  const token = signedToken.slice(0, separator);
  const signature = signedToken.slice(separator + 1);
  const expected = signToken(token);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

function csrfValuesAreEqual(cookieValue, headerValue) {
  if (typeof cookieValue !== "string" || typeof headerValue !== "string") return false;
  const cookieBuffer = Buffer.from(cookieValue);
  const headerBuffer = Buffer.from(headerValue);
  return cookieBuffer.length === headerBuffer.length
    && timingSafeEqual(cookieBuffer, headerBuffer);
}

export function issueCsrfToken(_req, res) {
  const token = randomBytes(32).toString("base64url");
  const signedToken = `${token}.${signToken(token)}`;
  res.cookie(CSRF_COOKIE_NAME, signedToken, cookieOptions);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ csrfToken: signedToken });
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.startsWith("Bearer ")) return next();

  const csrfCookie = req.cookies?.bj_csrf;
  const csrfHeader = req.get("x-csrf-token");
  if (!csrfValuesAreEqual(csrfCookie, csrfHeader) || !signedTokenIsValid(csrfCookie)) {
    return res.status(403).json({
      error: "The security token is missing or invalid. Refresh and try again.",
      code: "CSRF_TOKEN_INVALID",
    });
  }

  return next();
}
