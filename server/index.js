import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";
import { config, isProduction } from "./config.js";
import { healthcheck } from "./db.js";
import { MySqlRepository } from "./repository.js";
import { EnterpriseAdminControlRepository } from "./modules/admin/enterprise-control-repository.js";
import { createRuntimeCloudinaryMedia, createRuntimeRedisCache } from "./services/runtime-integrations.js";

const hasApplicationShells = (directory) =>
  existsSync(path.join(directory, "index.html")) &&
  existsSync(path.join(directory, "admin", "index.html"));

const staticRoot = isProduction
  ? [
      path.resolve(process.cwd(), "dist", "client"),
      path.resolve(process.cwd(), "client"),
    ].find(hasApplicationShells)
  : null;

if (isProduction && !staticRoot) {
  throw new Error(
    "Production storefront and administrator builds are missing. Run npm run build before npm start.",
  );
}

const repository = new MySqlRepository();
const adminControl = new EnterpriseAdminControlRepository({ vaultSecret: config.adminVaultKey });
await adminControl.initialize();

const cache = createRuntimeRedisCache({
  controlRepository: adminControl,
  fallbackConfig: {
    url: config.redis.restUrl,
    token: config.redis.restToken,
    namespace: config.redis.namespace,
    defaultTtlSeconds: config.redis.catalogTtlSeconds,
    requestTimeoutMs: config.redis.requestTimeoutMs,
  },
});

const media = createRuntimeCloudinaryMedia({
  controlRepository: adminControl,
  fallbackConfig: {
    cloudName: config.cloudinary.cloudName,
    apiKey: config.cloudinary.apiKey,
    apiSecret: config.cloudinary.apiSecret,
    folder: config.cloudinary.folder,
    signatureAlgorithm: config.cloudinary.signatureAlgorithm,
  },
});

const app = createApp({
  repository,
  healthcheck,
  staticRoot,
  cache,
  media,
  adminControl,
});

app.listen(config.port, "0.0.0.0", async () => {
  const [redis, cloudinary] = await Promise.all([cache.health(), media.health()]);
  console.log(`BJ Electronics listening on port ${config.port}`);
  console.log(`Redis cache: ${redis.status}`);
  console.log(`Cloudinary media: ${cloudinary.status}`);
});
