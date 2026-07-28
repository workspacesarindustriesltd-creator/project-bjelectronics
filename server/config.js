import "dotenv/config";

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: number(process.env.PORT, 4000),
  storeUrl: process.env.STORE_URL || process.env.CLIENT_URL || "http://localhost:5173",
  adminUrl: process.env.ADMIN_URL || "http://localhost:5173/admin",
  publicApiUrl: process.env.PUBLIC_API_URL || "http://localhost:4000",
  jwtSecret: process.env.JWT_SECRET || "change-this-development-secret",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  adminSeed: {
    name: process.env.ADMIN_NAME || "Store Administrator",
    email: process.env.ADMIN_EMAIL || "admin@bjelectronics.shop",
    phone: process.env.ADMIN_PHONE || "01700000001",
    password: process.env.ADMIN_PASSWORD || "admin12345",
  },
  database: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: number(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bj_electronics",
    connectionLimit: number(process.env.DB_CONNECTION_LIMIT, 10),
  },
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID || "",
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
    isLive: process.env.SSLCOMMERZ_IS_LIVE === "true",
  },
};

export const isProduction = config.nodeEnv === "production";
