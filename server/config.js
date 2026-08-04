import "dotenv/config";

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const jwtSecret = read(
  "JWT_SECRET",
  isProduction ? "" : "change-this-development-secret",
  { requiredInProduction: true },
);

if (isProduction && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters in production.");
}

export const config = {
  nodeEnv,
  port: number(process.env.PORT, 4000),
  storeUrl: origin("STORE_URL", "http://localhost:5173", { requiredInProduction: true }),
  adminUrl: origin("ADMIN_URL", "http://localhost:5173", { requiredInProduction: true }),
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
  sslcommerz: {
    storeId: read("SSLCOMMERZ_STORE_ID"),
    storePassword: read("SSLCOMMERZ_STORE_PASSWORD"),
    isLive: process.env.SSLCOMMERZ_IS_LIVE === "true",
  },
};
