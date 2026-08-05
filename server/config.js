import "dotenv/config";

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const boolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const nodeEnv = process.env.NODE_ENV?.trim() || "development";
export const isProduction = nodeEnv === "production";

const read = (name, fallback = "", { requiredInProduction = false } = {}) => {
  const value = process.env[name]?.trim();
  if (requiredInProduction && isProduction && !value) {
    throw new Error(`${name} is required when NODE_ENV=production.`);
  }
  return value || fallback;
};

const origin = (name, fallback, options = {}) => {
  const value = read(name, fallback, options);
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported protocol.");
    return parsed.origin;
  } catch {
    throw new Error(`${name} must be a valid HTTP or HTTPS URL.`);
  }
};

const baseUrl = (name, fallback, options = {}) => {
  const value = read(name, fallback, options);
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported protocol.");
    return value.replace(/\/+$/, "");
  } catch {
    throw new Error(`${name} must be a valid HTTP or HTTPS URL.`);
  }
};

const optionalHttpsUrl = (name) => {
  const value = read(name);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("HTTPS is required.");
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
};

const jwtSecret = read(
  "JWT_SECRET",
  isProduction ? "" : "change-this-development-secret",
  { requiredInProduction: true },
);

if (isProduction && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters in production.");
}

const redisRestUrl = optionalHttpsUrl("UPSTASH_REDIS_REST_URL");
const redisRestToken = read("UPSTASH_REDIS_REST_TOKEN");
if (Boolean(redisRestUrl) !== Boolean(redisRestToken)) {
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together.");
}
if (isProduction && boolean(process.env.REDIS_REQUIRED) && !redisRestUrl) {
  throw new Error("Redis is required in production when REDIS_REQUIRED=true.");
}

const cloudinaryCloudName = read("CLOUDINARY_CLOUD_NAME");
const cloudinaryApiKey = read("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = read("CLOUDINARY_API_SECRET");
const cloudinaryConfiguredCount = [cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret].filter(Boolean).length;
if (cloudinaryConfiguredCount > 0 && cloudinaryConfiguredCount < 3) {
  throw new Error("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be configured together.");
}
if (isProduction && boolean(process.env.CLOUDINARY_REQUIRED) && cloudinaryConfiguredCount !== 3) {
  throw new Error("Cloudinary is required in production when CLOUDINARY_REQUIRED=true.");
}

const cloudinarySignatureAlgorithm = read("CLOUDINARY_SIGNATURE_ALGORITHM", "sha256").toLowerCase();
if (!["sha1", "sha256"].includes(cloudinarySignatureAlgorithm)) {
  throw new Error("CLOUDINARY_SIGNATURE_ALGORITHM must be sha1 or sha256.");
}

export const config = {
  nodeEnv,
  port: number(process.env.PORT, 4000),
  storeUrl: origin("STORE_URL", "http://localhost:5173", { requiredInProduction: true }),
  adminUrl: origin("ADMIN_URL", "http://localhost:5174", { requiredInProduction: true }),
  publicApiUrl: baseUrl("PUBLIC_API_URL", "http://localhost:4000", { requiredInProduction: true }),
  jwtSecret,
  cookieDomain: read("COOKIE_DOMAIN") || undefined,
  adminSeed: {
    name: read("ADMIN_NAME", "Store Administrator"),
    email: read("ADMIN_EMAIL"),
    phone: read("ADMIN_PHONE"),
    password: read("ADMIN_PASSWORD"),
  },
  database: {
    host: read("DB_HOST", "127.0.0.1"),
    port: number(process.env.DB_PORT, 3306),
    user: read("DB_USER", "root"),
    password: process.env.DB_PASSWORD || "",
    database: read("DB_NAME", "bj_electronics"),
    connectionLimit: number(process.env.DB_CONNECTION_LIMIT, 10),
  },
  redis: {
    restUrl: redisRestUrl,
    restToken: redisRestToken,
    namespace: read("REDIS_NAMESPACE", `bj-electronics:${nodeEnv}`),
    catalogTtlSeconds: number(process.env.REDIS_CATALOG_TTL_SECONDS, 300),
    reviewTtlSeconds: number(process.env.REDIS_REVIEW_TTL_SECONDS, 60),
    requestTimeoutMs: number(process.env.REDIS_REQUEST_TIMEOUT_MS, 2500),
    required: boolean(process.env.REDIS_REQUIRED),
  },
  cloudinary: {
    cloudName: cloudinaryCloudName,
    apiKey: cloudinaryApiKey,
    apiSecret: cloudinaryApiSecret,
    folder: read("CLOUDINARY_UPLOAD_FOLDER", "bj-electronics/products"),
    signatureAlgorithm: cloudinarySignatureAlgorithm,
    required: boolean(process.env.CLOUDINARY_REQUIRED),
  },
};
