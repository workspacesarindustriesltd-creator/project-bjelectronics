import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";
import { config, isProduction } from "./config.js";
import { healthcheck } from "./db.js";
import { MySqlRepository } from "./repository.js";
import { createCloudinaryMediaService } from "./services/cloudinary-media.js";
import { createRedisCache } from "./services/redis-cache.js";

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

const cache = createRedisCache({
  url: config.redis.restUrl,
  token: config.redis.restToken,
  namespace: config.redis.namespace,
  defaultTtlSeconds: config.redis.catalogTtlSeconds,
  requestTimeoutMs: config.redis.requestTimeoutMs,
});

const media = createCloudinaryMediaService({
  cloudName: config.cloudinary.cloudName,
  apiKey: config.cloudinary.apiKey,
  apiSecret: config.cloudinary.apiSecret,
  folder: config.cloudinary.folder,
  signatureAlgorithm: config.cloudinary.signatureAlgorithm,
});

const app = createApp({
  repository: new MySqlRepository(),
  healthcheck,
  staticRoot,
  cache,
  media,
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`BJ Electronics listening on port ${config.port}`);
  console.log(`Redis cache: ${cache.enabled ? "enabled" : "disabled"}`);
  console.log(`Cloudinary media: ${media.enabled ? "enabled" : "disabled"}`);
});
