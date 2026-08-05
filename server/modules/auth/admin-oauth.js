import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { clearSessionCookie, createSession, setAdminSessionCookie } from "../../auth.js";
import { config, isProduction } from "../../config.js";

const STATE_COOKIE = "bj_admin_oauth_state";
const STATE_AUDIENCE = "bj-electronics-admin-oauth";
const STATE_ISSUER = "bj-electronics-api";

function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/admin/auth/oauth",
    maxAge: 10 * 60 * 1000,
    priority: "high",
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}

function callbackUrl(provider) {
  return `${config.oauth.callbackBaseUrl}/api/admin/auth/oauth/${provider}/callback`;
}

async function providerCredentials(controlRepository, provider) {
  const key = provider === "google" ? "google_oauth" : "github_oauth";
  const runtime = await controlRepository.getIntegration(key).catch(() => null);
  const fallback = config.oauth[provider];
  return {
    clientId: runtime?.publicConfig?.clientId || fallback.clientId,
    clientSecret: runtime?.secrets?.clientSecret || fallback.clientSecret,
  };
}

function redirectWithError(res, message) {
  const target = new URL("/admin/login", config.adminUrl);
  target.searchParams.set("oauthError", String(message || "OAuth authentication failed.").slice(0, 180));
  return res.redirect(303, target.toString());
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_description || body.message || body.error || `OAuth provider returned HTTP ${response.status}.`);
  return body;
}

async function googleIdentity(code, credentials) {
  const token = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: callbackUrl("google"),
      grant_type: "authorization_code",
    }),
  });
  const profile = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profile.email || profile.email_verified !== true) throw new Error("Google did not return a verified email address.");
  return { providerUserId: String(profile.sub), email: profile.email.toLowerCase(), name: profile.name || profile.email };
}

async function githubIdentity(code, credentials) {
  const token = await fetchJson("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "BJ-Electronics-Admin" },
    body: JSON.stringify({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      redirect_uri: callbackUrl("github"),
    }),
  });
  const headers = { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "BJ-Electronics-Admin" };
  const [profile, emails] = await Promise.all([
    fetchJson("https://api.github.com/user", { headers }),
    fetchJson("https://api.github.com/user/emails", { headers }),
  ]);
  const verified = Array.isArray(emails)
    ? emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified)
    : null;
  const email = verified?.email || profile.email;
  if (!email) throw new Error("GitHub did not return a verified email address. Grant the user:email scope.");
  return { providerUserId: String(profile.id), email: email.toLowerCase(), name: profile.name || profile.login || email };
}

export function createAdminOAuthRouter(repository, controlRepository) {
  const router = Router();

  router.get("/providers", async (_req, res) => {
    const [google, github] = await Promise.all([
      providerCredentials(controlRepository, "google"),
      providerCredentials(controlRepository, "github"),
    ]);
    return res.json({
      providers: {
        google: { configured: Boolean(google.clientId && google.clientSecret) },
        github: { configured: Boolean(github.clientId && github.clientSecret) },
        email: { configured: true },
      },
    });
  });

  router.get("/:provider/start", async (req, res) => {
    const provider = req.params.provider;
    if (!new Set(["google", "github"]).has(provider)) return res.status(404).json({ error: "OAuth provider not found." });
    const credentials = await providerCredentials(controlRepository, provider);
    if (!credentials.clientId || !credentials.clientSecret) return redirectWithError(res, `${provider} authentication is not configured.`);

    const state = jwt.sign(
      { provider, nonce: crypto.randomBytes(16).toString("hex") },
      config.jwtSecret,
      { expiresIn: "10m", issuer: STATE_ISSUER, audience: STATE_AUDIENCE },
    );
    res.cookie(STATE_COOKIE, state, stateCookieOptions());

    if (provider === "google") {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: callbackUrl("google"),
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
      }).toString();
      return res.redirect(302, url.toString());
    }

    const url = new URL("https://github.com/login/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: callbackUrl("github"),
      scope: "read:user user:email",
      state,
      allow_signup: "false",
    }).toString();
    return res.redirect(302, url.toString());
  });

  router.get("/:provider/callback", async (req, res) => {
    const provider = req.params.provider;
    try {
      const state = String(req.query.state || "");
      if (!state || state !== req.cookies?.[STATE_COOKIE]) throw new Error("OAuth state validation failed.");
      const decoded = jwt.verify(state, config.jwtSecret, { issuer: STATE_ISSUER, audience: STATE_AUDIENCE });
      if (decoded.provider !== provider) throw new Error("OAuth provider state does not match.");
      if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
      const code = String(req.query.code || "");
      if (!code) throw new Error("OAuth authorization code is missing.");

      const credentials = await providerCredentials(controlRepository, provider);
      if (!credentials.clientId || !credentials.clientSecret) throw new Error(`${provider} authentication is not configured.`);
      const identity = provider === "google"
        ? await googleIdentity(code, credentials)
        : await githubIdentity(code, credentials);
      const user = await repository.findUserByEmail(identity.email);
      if (!user || user.role !== "admin") {
        throw new Error("This verified account is not assigned to a BJ Electronics administrator.");
      }

      await controlRepository.linkOAuthAccount({
        userId: user.id,
        provider,
        providerUserId: identity.providerUserId,
        email: identity.email,
      });
      await controlRepository.audit({
        actorUserId: user.id,
        action: "admin.oauth.login",
        entityType: "oauth_account",
        entityId: provider,
        metadata: { email: identity.email },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
      });

      setAdminSessionCookie(res, createSession(user, "bj-electronics-admin", "2h"));
      clearSessionCookie(res);
      res.clearCookie(STATE_COOKIE, stateCookieOptions());
      const target = new URL("/admin/dashboard", config.adminUrl);
      target.searchParams.set("authenticated", provider);
      return res.redirect(303, target.toString());
    } catch (error) {
      res.clearCookie(STATE_COOKIE, stateCookieOptions());
      return redirectWithError(res, error.message);
    }
  });

  return router;
}
