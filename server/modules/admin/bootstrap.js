import { Router } from "express";
import { requireAdmin } from "../../auth.js";
import { PROVIDERS } from "./control-center.js";

function hasPermission(authorization, permission) {
  return authorization.permissions.includes("*") || authorization.permissions.includes(permission);
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

export function createAdminBootstrapRouter(controlRepository) {
  const router = Router();
  router.use(requireAdmin);
  router.get("/bootstrap", async (req, res) => {
    const authorization = await controlRepository.getAuthorization(req.user.sub);
    const [settings, integrations, roleData, users] = await Promise.all([
      hasPermission(authorization, "storefront.manage") || hasPermission(authorization, "dashboard.read")
        ? controlRepository.listSettings()
        : Promise.resolve({}),
      hasPermission(authorization, "integrations.manage") || hasPermission(authorization, "dashboard.read")
        ? controlRepository.listIntegrations()
        : Promise.resolve([]),
      hasPermission(authorization, "users.manage")
        ? controlRepository.listRoles()
        : Promise.resolve({ roles: [], permissions: [] }),
      hasPermission(authorization, "users.manage")
        ? controlRepository.listAdminUsers()
        : Promise.resolve([]),
    ]);

    return res.json({
      authorization,
      settings,
      integrations,
      providerCatalog: hasPermission(authorization, "integrations.manage") ? PROVIDERS : {},
      roles: roleData.roles,
      permissions: roleData.permissions,
      users,
      environment: hasPermission(authorization, "settings.manage") ? environmentStatus() : [],
    });
  });
  return router;
}
