import { createRedisCache } from "./redis-cache.js";
import { createCloudinaryMediaService } from "./cloudinary-media.js";

const REFRESH_INTERVAL_MS = 30_000;

export function createRuntimeRedisCache({ controlRepository, fallbackConfig, logger = console }) {
  let current = null;
  let loadedAt = 0;

  async function resolve(force = false) {
    if (!force && current && Date.now() - loadedAt < REFRESH_INTERVAL_MS) return current;
    const runtime = await controlRepository.getIntegration("redis").catch(() => null);
    const config = runtime
      ? {
          url: runtime.publicConfig.url,
          token: runtime.secrets.token,
          namespace: runtime.publicConfig.namespace || fallbackConfig.namespace,
          defaultTtlSeconds: runtime.publicConfig.catalogTtlSeconds || fallbackConfig.defaultTtlSeconds,
          requestTimeoutMs: runtime.publicConfig.requestTimeoutMs || fallbackConfig.requestTimeoutMs,
        }
      : fallbackConfig;
    try {
      current = createRedisCache({ ...config, logger });
    } catch (error) {
      logger.warn?.("Runtime Redis configuration is invalid; caching remains disabled.", error.message);
      current = createRedisCache({});
    }
    loadedAt = Date.now();
    return current;
  }

  const invoke = (method) => async (...args) => (await resolve())[method](...args);
  return {
    get enabled() { return Boolean(current?.enabled || (fallbackConfig.url && fallbackConfig.token)); },
    getJson: invoke("getJson"),
    setJson: invoke("setJson"),
    delete: invoke("delete"),
    deleteMany: invoke("deleteMany"),
    remember: invoke("remember"),
    health: invoke("health"),
    async invalidateConfiguration() {
      loadedAt = 0;
      await resolve(true);
    },
  };
}

export function createRuntimeCloudinaryMedia({ controlRepository, fallbackConfig, logger = console }) {
  let current = null;
  let loadedAt = 0;

  async function resolve(force = false) {
    if (!force && current && Date.now() - loadedAt < REFRESH_INTERVAL_MS) return current;
    const runtime = await controlRepository.getIntegration("cloudinary").catch(() => null);
    const config = runtime
      ? {
          cloudName: runtime.publicConfig.cloudName,
          apiKey: runtime.publicConfig.apiKey,
          apiSecret: runtime.secrets.apiSecret,
          folder: runtime.publicConfig.folder || fallbackConfig.folder,
          signatureAlgorithm: runtime.publicConfig.signatureAlgorithm || fallbackConfig.signatureAlgorithm,
        }
      : fallbackConfig;
    try {
      current = createCloudinaryMediaService(config);
    } catch (error) {
      logger.warn?.("Runtime Cloudinary configuration is invalid; media uploads remain disabled.", error.message);
      current = createCloudinaryMediaService({});
    }
    loadedAt = Date.now();
    return current;
  }

  return {
    get enabled() { return Boolean(current?.enabled || (fallbackConfig.cloudName && fallbackConfig.apiKey && fallbackConfig.apiSecret)); },
    async createUploadSignature(options) {
      return (await resolve()).createUploadSignature(options);
    },
    optimizeDeliveryUrl(url, options) {
      return current?.optimizeDeliveryUrl(url, options) || url;
    },
    async health() {
      return (await resolve()).health();
    },
    async invalidateConfiguration() {
      loadedAt = 0;
      await resolve(true);
    },
  };
}
