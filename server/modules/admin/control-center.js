import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../auth.js";
import { parse } from "../../http/validate.js";
import { config } from "../../config.js";

const PROVIDERS = {
  redis: {
    name: "Upstash Redis",
    category: "Infrastructure",
    description: "Distributed catalog and review cache.",
    publicFields: ["url", "namespace", "catalogTtlSeconds", "requestTimeoutMs"],
    secretFields: ["token"],
    runtime: true,
  },
  cloudinary: {
    name: "Cloudinary",
    category: "Media",
    description: "Signed product image and video uploads.",
    publicFields: ["cloudName", "apiKey", "folder", "signatureAlgorithm"],
    secretFields: ["apiSecret"],
    runtime: true,
  },
  google_oauth: {
    name: "Google account authentication",
    category: "Authentication",
    description: "Administrator sign-in using a verified Google account email.",
    publicFields: ["clientId"],
    secretFields: ["clientSecret"],
    runtime: true,
  },
  github_oauth: {
    name: "GitHub account authentication",
    category: "Authentication",
    description: "Administrator sign-in using a verified GitHub account email.",
    publicFields: ["clientId"],
    secretFields: ["clientSecret"],
    runtime: true,
  },
  github_api: {
    name: "GitHub repository",
    category: "Development",
    description: "Repository metadata, workflow and deployment visibility.",
    publicFields: ["repository"],
    secretFields: ["token"],
    runtime: true,
  },
  smtp: {
    name: "Transactional email",
    category: "Communication",
    description: "SMTP delivery configuration for order and system notifications.",
    publicFields: ["host", "port", "secure", "username", "fromAddress"],
    secretFields: ["password"],
    runtime: false,
  },
  sslcommerz: {
    name: "SSLCOMMERZ",
    category: "Payments",
    description: "Bangladesh online payment gateway configuration.",
    publicFields: ["storeId", "sandbox"],
    secretFields: ["storePassword"],
    runtime: false,
  },
  pathao: {
    name: "Pathao Courier",
    category: "Delivery",
    description: "Courier order and tracking connection.",
    publicFields: ["baseUrl", "merchantId"],
    secretFields: ["token"],
    runtime: false,
  },
  steadfast: {
    name: "Steadfast Courier",
    category: "Delivery",
    description: "Courier consignment and status synchronization.",
    publicFields: ["baseUrl", "apiKey"],
    secretFields: ["secretKey"],
    runtime: false,
  },
  redx: {
    name: "RedX",
    category: "Delivery",
    description: "Parcel creation and delivery status integration.",
    publicFields: ["baseUrl"],
    secretFields: ["token"],
    runtime: false,
  },
};

const settingsSchema = z.record(z.string(), z.unknown());
const integrationSchema = z.object({
  publicConfig: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  secrets: z.record(z.string(), z.string()).default({}),
});
const roleSchema = z.object({
  code: z.string().trim().regex(/^[a-z][a-z0-9_]{2,63}$/),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(255).optional(),
  permissions: z.array(z.string().trim()).max(100),
});
const roleAssignmentSchema = z.object({ roles: z.array(z.string().trim()).min(1).max(20) });

const hasPermission = (authorization, code) => authorization.permissions.includes("*") || authorization.permissions.includes(code);

function allow(code) {
  return (req, res, next) => hasPermission(req.adminAuthorization, code)
    ? next()
    : res.status(403).json({ error: "Your administrator role does not allow this action.", code: "ADMIN_PERMISSION_DENIED" });
}

function requestMetadata(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

function environmentStatus() {
  const definitions = [
    ["NODE_ENV", "Runtime", false], ["STORE_URL", "Application", false], ["ADMIN_URL", "Application", false],
    ["PUBLIC_API_URL", "Application", false], ["JWT_SECRET", "Security", true], ["ADMIN_VAULT_KEY", "Security", true],
    ["DB_HOST", "Database", false], ["DB_NAME", "Database", false], ["DB_USER", "Database", false], ["DB_PASSWORD", "Database", true],
    ["UPSTASH_REDIS_REST_URL", "Redis", false], ["UPSTASH_REDIS_REST_TOKEN", "Redis", true],
    ["CLOUDINARY_CLOUD_NAME", "Cloudinary", false], ["CLOUDINARY_API_KEY", "Cloudinary", false], ["CLOUDINARY_API_SECRET", "Cloudinary", true],
    ["GOOGLE_CLIENT_ID", "OAuth", false], ["GOOGLE_CLIENT_SECRET", "OAuth", true],
    ["GITHUB_CLIENT_ID", "OAuth", false], ["GITHUB_CLIENT_SECRET", "OAuth", true],
  ];
  return definitions.map(([name, group, secret]) => ({
    name,
    group,
    secret,
    configured: Boolean(process.env[name]?.trim()),
    source: "Hostinger environment",
  }));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `Connection returned HTTP ${response.status}.`);
  return body;
}

async function testProvider(provider, integration) {
  const publicConfig = integration?.publicConfig || {};
  const secrets = integration?.secrets || {};
  if (provider === "redis") {
    if (!publicConfig.url || !secrets.token) throw new Error("Redis REST URL and token are required.");
    const body = await fetchJson(String(publicConfig.url).replace(/\/+$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${secrets.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["PING"]),
    });
    if (body.result !== "PONG") throw new Error("Redis did not return PONG.");
    return { status: "connected", discovered: { response: "PONG", namespace: publicConfig.namespace || "bj-electronics:production" } };
  }
  if (provider === "cloudinary") {
    if (!publicConfig.cloudName || !publicConfig.apiKey || !secrets.apiSecret) throw new Error("Cloud name, API key and API secret are required.");
    const body = await fetchJson(`https://api.cloudinary.com/v1_1/${encodeURIComponent(publicConfig.cloudName)}/resources/image?max_results=1`, {
      headers: { Authorization: `Basic ${Buffer.from(`${publicConfig.apiKey}:${secrets.apiSecret}`).toString("base64")}` },
    });
    return { status: "connected", discovered: { cloudName: publicConfig.cloudName, sampleResources: Array.isArray(body.resources) ? body.resources.length : 0 } };
  }
  if (provider === "github_api") {
    if (!secrets.token) throw new Error("GitHub access token is required.");
    const profile = await fetchJson("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${secrets.token}`, Accept: "application/vnd.github+json", "User-Agent": "BJ-Electronics-Admin" },
    });
    let repository = null;
    if (publicConfig.repository) {
      repository = await fetchJson(`https://api.github.com/repos/${publicConfig.repository}`, {
        headers: { Authorization: `Bearer ${secrets.token}`, Accept: "application/vnd.github+json", "User-Agent": "BJ-Electronics-Admin" },
      });
    }
    return { status: "connected", discovered: { login: profile.login, repository: repository ? { fullName: repository.full_name, private: repository.private, defaultBranch: repository.default_branch } : null } };
  }
  if (provider === "google_oauth") {
    if (!publicConfig.clientId || !secrets.clientSecret) throw new Error("Google client ID and client secret are required.");
    const discovery = await fetchJson("https://accounts.google.com/.well-known/openid-configuration");
    return { status: "configured", discovered: { issuer: discovery.issuer, callbackUrl: `${config.oauth.callbackBaseUrl}/api/admin/auth/oauth/google/callback` } };
  }
  if (provider === "github_oauth") {
    if (!publicConfig.clientId || !secrets.clientSecret) throw new Error("GitHub client ID and client secret are required.");
    return { status: "configured", discovered: { authorizationEndpoint: "https://github.com/login/oauth/authorize", callbackUrl: `${config.oauth.callbackBaseUrl}/api/admin/auth/oauth/github/callback` } };
  }
  const descriptor = PROVIDERS[provider];
  const missingPublic = descriptor.publicFields.filter((field) => publicConfig[field] === undefined || publicConfig[field] === "");
  const missingSecrets = descriptor.secretFields.filter((field) => !secrets[field]);
  if (missingPublic.length || missingSecrets.length) throw new Error(`Complete the required fields: ${[...missingPublic, ...missingSecrets].join(", ")}.`);
  return { status: "configured", discovered: { validatedAt: new Date().toISOString(), note: "Credentials are stored. Provider-specific transaction activation remains disabled until its workflow module is enabled." } };
}

export function createAdminControlRouter(controlRepository, { cache, media } = {}) {
  const router = Router();
  router.use(requireAdmin);
  router.use(async (req, res, next) => {
    try {
      req.adminAuthorization = await controlRepository.getAuthorization(req.user.sub);
      return next();
    } catch (error) {
      return next(error);
    }
  });

  router.get("/bootstrap", allow("dashboard.read"), async (req, res) => {
    const [settings, integrations, roles, users] = await Promise.all([
      controlRepository.listSettings(),
      controlRepository.listIntegrations(),
      hasPermission(req.adminAuthorization, "users.manage") ? controlRepository.listRoles() : Promise.resolve({ roles: [], permissions: [] }),
      hasPermission(req.adminAuthorization, "users.manage") ? controlRepository.listAdminUsers() : Promise.resolve([]),
    ]);
    return res.json({
      authorization: req.adminAuthorization,
      settings,
      integrations,
      providerCatalog: PROVIDERS,
      roles: roles.roles,
      permissions: roles.permissions,
      users,
      environment: hasPermission(req.adminAuthorization, "settings.manage") ? environmentStatus() : [],
    });
  });

  router.get("/settings", allow("storefront.manage"), async (_req, res) => res.json({ settings: await controlRepository.listSettings() }));
  router.put("/settings/:group", allow("storefront.manage"), async (req, res) => {
    const group = parse(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/), req.params.group);
    const value = parse(settingsSchema, req.body);
    await controlRepository.saveSetting(group, value, req.user.sub);
    await controlRepository.audit({ actorUserId: req.user.sub, action: "settings.update", entityType: "store_settings", entityId: group, metadata: { fields: Object.keys(value) }, ...requestMetadata(req) });
    return res.json({ group, value });
  });

  router.get("/roles", allow("users.manage"), async (_req, res) => res.json(await controlRepository.listRoles()));
  router.post("/roles", allow("users.manage"), async (req, res) => {
    const role = await controlRepository.saveRole(parse(roleSchema, req.body));
    await controlRepository.audit({ actorUserId: req.user.sub, action: "role.save", entityType: "admin_role", entityId: role.code, ...requestMetadata(req) });
    return res.status(201).json({ role });
  });
  router.get("/users", allow("users.manage"), async (_req, res) => res.json({ users: await controlRepository.listAdminUsers() }));
  router.patch("/users/:id/roles", allow("users.manage"), async (req, res) => {
    if (req.params.id === req.user.sub && !req.body?.roles?.includes("super_admin") && req.adminAuthorization.permissions.includes("*")) {
      return res.status(409).json({ error: "You cannot remove your own super administrator access." });
    }
    const data = parse(roleAssignmentSchema, req.body);
    const authorization = await controlRepository.setUserRoles(req.params.id, data.roles);
    if (!authorization) return res.status(404).json({ error: "Administrator account not found." });
    await controlRepository.audit({ actorUserId: req.user.sub, action: "admin.roles.update", entityType: "user", entityId: req.params.id, metadata: data, ...requestMetadata(req) });
    return res.json({ authorization });
  });

  router.get("/audit", allow("audit.read"), async (req, res) => res.json({ logs: await controlRepository.listAudit(req.query) }));
  router.get("/environment", allow("settings.manage"), (_req, res) => res.json({ variables: environmentStatus() }));

  router.get("/integrations", allow("integrations.manage"), async (_req, res) => res.json({ integrations: await controlRepository.listIntegrations(), providerCatalog: PROVIDERS }));
  router.put("/integrations/:provider", allow("integrations.manage"), async (req, res) => {
    const provider = parse(z.enum(Object.keys(PROVIDERS)), req.params.provider);
    const integration = await controlRepository.saveIntegration(provider, parse(integrationSchema, req.body), req.user.sub);
    if (provider === "redis") await cache?.invalidateConfiguration?.();
    if (provider === "cloudinary") await media?.invalidateConfiguration?.();
    await controlRepository.audit({ actorUserId: req.user.sub, action: "integration.configure", entityType: "integration", entityId: provider, metadata: { publicFields: Object.keys(integration.publicConfig) }, ...requestMetadata(req) });
    return res.json({ integration: { ...integration, secrets: undefined, secretsConfigured: true } });
  });
  router.post("/integrations/:provider/test", allow("integrations.manage"), async (req, res) => {
    const provider = parse(z.enum(Object.keys(PROVIDERS)), req.params.provider);
    const integration = await controlRepository.getIntegration(provider);
    if (!integration) return res.status(404).json({ error: "Configure this integration before testing it." });
    try {
      const result = await testProvider(provider, integration);
      await controlRepository.setIntegrationResult(provider, result);
      if (provider === "redis") await cache?.invalidateConfiguration?.();
      if (provider === "cloudinary") await media?.invalidateConfiguration?.();
      await controlRepository.audit({ actorUserId: req.user.sub, action: "integration.test.success", entityType: "integration", entityId: provider, metadata: result.discovered, ...requestMetadata(req) });
      return res.json(result);
    } catch (error) {
      await controlRepository.setIntegrationResult(provider, { status: "degraded", error: error.message });
      await controlRepository.audit({ actorUserId: req.user.sub, action: "integration.test.failed", entityType: "integration", entityId: provider, metadata: { error: error.message }, ...requestMetadata(req) });
      return res.status(422).json({ error: error.message, status: "degraded" });
    }
  });
  router.delete("/integrations/:provider", allow("integrations.manage"), async (req, res) => {
    const provider = parse(z.enum(Object.keys(PROVIDERS)), req.params.provider);
    await controlRepository.disconnectIntegration(provider);
    if (provider === "redis") await cache?.invalidateConfiguration?.();
    if (provider === "cloudinary") await media?.invalidateConfiguration?.();
    await controlRepository.audit({ actorUserId: req.user.sub, action: "integration.disconnect", entityType: "integration", entityId: provider, ...requestMetadata(req) });
    return res.status(204).end();
  });

  return router;
}

export function createStorefrontConfigRouter(controlRepository) {
  const router = Router();
  router.get("/config", async (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(await controlRepository.publicStorefrontConfig());
  });
  return router;
}

export { PROVIDERS, testProvider };
