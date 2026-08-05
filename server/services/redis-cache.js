const DEFAULT_NAMESPACE = "bj-electronics";

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeUrl(value) {
  if (!value) return "";
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") {
    throw new Error("UPSTASH_REDIS_REST_URL must use HTTPS.");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function disabledCache() {
  return {
    enabled: false,
    async getJson() { return null; },
    async setJson() { return false; },
    async delete() { return false; },
    async deleteMany() { return false; },
    async remember(_key, loader) {
      return { value: await loader(), status: "BYPASS" };
    },
    async health() { return { status: "disabled" }; },
  };
}

export function createRedisCache({
  url,
  token,
  namespace = DEFAULT_NAMESPACE,
  defaultTtlSeconds = 300,
  requestTimeoutMs = 2500,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  if (!url && !token) return disabledCache();
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together.");
  }
  if (typeof fetchImpl !== "function") throw new Error("A Fetch API implementation is required for Redis REST caching.");

  const endpoint = normalizeUrl(url);
  const ttl = positiveInteger(defaultTtlSeconds, 300);
  const timeout = positiveInteger(requestTimeoutMs, 2500);
  const prefix = String(namespace || DEFAULT_NAMESPACE).trim().replace(/:+$/, "");
  const inFlight = new Map();
  let lastWarningAt = 0;

  const cacheKey = (key) => `${prefix}:${key}`;

  function warn(error) {
    const now = Date.now();
    if (now - lastWarningAt < 30_000) return;
    lastWarningAt = now;
    logger.warn?.("Redis cache unavailable; continuing without cache.", error?.message || error);
  }

  async function command(args) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(timeout),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      throw new Error(body.error || `Redis request failed with status ${response.status}.`);
    }
    return body.result;
  }

  async function getJson(key) {
    try {
      const value = await command(["GET", cacheKey(key)]);
      return value === null ? null : JSON.parse(value);
    } catch (error) {
      warn(error);
      return null;
    }
  }

  async function setJson(key, value, { ttlSeconds = ttl } = {}) {
    try {
      await command(["SET", cacheKey(key), JSON.stringify(value), "EX", positiveInteger(ttlSeconds, ttl)]);
      return true;
    } catch (error) {
      warn(error);
      return false;
    }
  }

  async function deleteMany(keys) {
    const normalized = [...new Set(keys.filter(Boolean).map(cacheKey))];
    if (!normalized.length) return true;
    try {
      await command(["DEL", ...normalized]);
      return true;
    } catch (error) {
      warn(error);
      return false;
    }
  }

  async function remember(key, loader, options = {}) {
    const cached = await getJson(key);
    if (cached !== null) return { value: cached, status: "HIT" };

    if (inFlight.has(key)) {
      return { value: await inFlight.get(key), status: "COALESCED" };
    }

    const pending = Promise.resolve().then(loader);
    inFlight.set(key, pending);
    try {
      const value = await pending;
      await setJson(key, value, options);
      return { value, status: "MISS" };
    } finally {
      inFlight.delete(key);
    }
  }

  return {
    enabled: true,
    getJson,
    setJson,
    delete: (key) => deleteMany([key]),
    deleteMany,
    remember,
    async health() {
      try {
        const result = await command(["PING"]);
        return { status: result === "PONG" ? "ok" : "degraded" };
      } catch (error) {
        return { status: "degraded", message: error.message };
      }
    },
  };
}
