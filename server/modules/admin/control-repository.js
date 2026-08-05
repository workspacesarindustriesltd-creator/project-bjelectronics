import crypto from "node:crypto";
import { pool, withTransaction } from "../../db.js";
import { SecretVault } from "../../services/secret-vault.js";

const PERMISSIONS = [
  ["dashboard.read", "View dashboard", "Dashboard"],
  ["orders.read", "View orders", "Orders"],
  ["orders.write", "Manage fulfillment", "Orders"],
  ["catalog.read", "View catalog", "Catalog"],
  ["catalog.write", "Manage products and stock", "Catalog"],
  ["catalog.import", "Import and export catalog", "Catalog"],
  ["customers.read", "View customers", "Customers"],
  ["promotions.manage", "Manage promotions", "Marketing"],
  ["media.manage", "Manage media", "Content"],
  ["storefront.manage", "Customize storefront", "Content"],
  ["integrations.manage", "Configure integrations", "Platform"],
  ["users.manage", "Manage administrators and roles", "Security"],
  ["audit.read", "View audit history", "Security"],
  ["settings.manage", "Manage platform settings", "Platform"],
];

const ROLE_DEFINITIONS = {
  super_admin: { name: "Super administrator", description: "Full platform access.", permissions: ["*"] },
  store_manager: { name: "Store manager", description: "Daily store, catalog, customer and campaign management.", permissions: PERMISSIONS.map(([code]) => code).filter((code) => !["users.manage", "integrations.manage"].includes(code)) },
  catalog_manager: { name: "Catalog manager", description: "Products, media, inventory and storefront content.", permissions: ["dashboard.read", "catalog.read", "catalog.write", "catalog.import", "media.manage", "storefront.manage"] },
  fulfillment: { name: "Fulfillment manager", description: "Orders, inventory and customer support operations.", permissions: ["dashboard.read", "orders.read", "orders.write", "catalog.read", "catalog.write", "customers.read"] },
  marketing: { name: "Marketing manager", description: "Promotions, customers, media and storefront content.", permissions: ["dashboard.read", "customers.read", "promotions.manage", "media.manage", "storefront.manage", "catalog.read"] },
  analyst: { name: "Analyst", description: "Read-only performance and operational access.", permissions: ["dashboard.read", "orders.read", "catalog.read", "customers.read", "audit.read"] },
};

const DEFAULT_SETTINGS = {
  identity: {
    storeName: "BJ ELECTRONICS",
    tagline: "Trusted electronics for modern Bangladesh",
    supportEmail: "",
    supportPhone: "",
    logoUrl: "/assets/bj-logo.png",
    faviconUrl: "/assets/bj-logo.png",
  },
  appearance: {
    primary: "#0f172a",
    accent: "#2563eb",
    radius: 14,
    density: "comfortable",
    announcement: "",
    announcementEnabled: false,
  },
  commerce: {
    currency: "BDT",
    lowStockThreshold: 10,
    freeShippingThreshold: 5000,
    standardShippingFee: 120,
    inventoryReservationMinutes: 15,
  },
  checkout: {
    cashOnDelivery: true,
    bankTransfer: true,
    guestCheckout: false,
    requirePhone: true,
    orderPrefix: "BJ",
  },
  seo: {
    title: "BJ Electronics — Home Appliances and Electronics",
    description: "Shop electronics and home appliances from BJ Electronics in Bangladesh.",
    indexStorefront: true,
  },
  notifications: {
    lowStockEmail: true,
    newOrderEmail: true,
    failedIntegrationEmail: true,
  },
};

const safeJson = (value, fallback = {}) => {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

export class AdminControlRepository {
  constructor({ vaultSecret }) {
    this.vault = new SecretVault(vaultSecret);
  }

  async initialize() {
    const statements = [
      `CREATE TABLE IF NOT EXISTS admin_roles (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS admin_permissions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        group_name VARCHAR(80) NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS admin_role_permissions (
        role_id INT UNSIGNED NOT NULL,
        permission_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT fk_admin_role_permissions_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_admin_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS admin_user_roles (
        user_id CHAR(36) NOT NULL,
        role_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_admin_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_admin_user_roles_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        actor_user_id CHAR(36) NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(80) NOT NULL,
        entity_id VARCHAR(120) NULL,
        metadata_json LONGTEXT NULL,
        ip_address VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_audit_created (created_at),
        INDEX idx_admin_audit_action (action, entity_type),
        CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS store_settings (
        setting_group VARCHAR(64) PRIMARY KEY,
        setting_value LONGTEXT NOT NULL,
        updated_by CHAR(36) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_store_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS integration_connections (
        provider VARCHAR(64) PRIMARY KEY,
        status ENUM('disabled','configured','connected','degraded') NOT NULL DEFAULT 'disabled',
        public_config_json LONGTEXT NULL,
        encrypted_secrets LONGTEXT NULL,
        discovered_json LONGTEXT NULL,
        last_error VARCHAR(500) NULL,
        last_tested_at DATETIME NULL,
        updated_by CHAR(36) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_integration_connections_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS oauth_accounts (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        provider VARCHAR(32) NOT NULL,
        provider_user_id VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_oauth_provider_user (provider, provider_user_id),
        UNIQUE KEY uq_oauth_user_provider (user_id, provider),
        CONSTRAINT fk_oauth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    ];
    for (const statement of statements) await pool.query(statement);

    for (const [code, name, group] of PERMISSIONS) {
      await pool.execute(
        `INSERT INTO admin_permissions (code, name, group_name) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), group_name = VALUES(group_name)`,
        [code, name, group],
      );
    }
    for (const [code, definition] of Object.entries(ROLE_DEFINITIONS)) {
      await pool.execute(
        `INSERT INTO admin_roles (code, name, description, is_system) VALUES (?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
        [code, definition.name, definition.description],
      );
      if (!definition.permissions.includes("*")) {
        for (const permission of definition.permissions) {
          await pool.execute(
            `INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
             SELECT r.id, p.id FROM admin_roles r, admin_permissions p WHERE r.code = ? AND p.code = ?`,
            [code, permission],
          );
        }
      }
    }
    await pool.query(
      `INSERT IGNORE INTO admin_user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u JOIN admin_roles r ON r.code = 'super_admin'
       WHERE u.role = 'admin' AND NOT EXISTS (SELECT 1 FROM admin_user_roles aur WHERE aur.user_id = u.id)`,
    );
    for (const [group, value] of Object.entries(DEFAULT_SETTINGS)) {
      await pool.execute(
        `INSERT IGNORE INTO store_settings (setting_group, setting_value) VALUES (?, ?)`,
        [group, JSON.stringify(value)],
      );
    }
  }

  async getAuthorization(userId) {
    const [roles] = await pool.execute(
      `SELECT r.id, r.code, r.name FROM admin_user_roles aur
       JOIN admin_roles r ON r.id = aur.role_id WHERE aur.user_id = ? ORDER BY r.name`,
      [userId],
    );
    if (roles.some((role) => role.code === "super_admin")) {
      return { roles, permissions: ["*"] };
    }
    const [permissions] = await pool.execute(
      `SELECT DISTINCT p.code FROM admin_user_roles aur
       JOIN admin_role_permissions rp ON rp.role_id = aur.role_id
       JOIN admin_permissions p ON p.id = rp.permission_id
       WHERE aur.user_id = ? ORDER BY p.code`,
      [userId],
    );
    return { roles, permissions: permissions.map((item) => item.code) };
  }

  async listRoles() {
    const [roles] = await pool.query("SELECT * FROM admin_roles ORDER BY is_system DESC, name");
    const [permissions] = await pool.query("SELECT * FROM admin_permissions ORDER BY group_name, name");
    const [links] = await pool.query(
      `SELECT rp.role_id, p.code FROM admin_role_permissions rp JOIN admin_permissions p ON p.id = rp.permission_id`,
    );
    return {
      roles: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: Boolean(role.is_system),
        permissions: role.code === "super_admin" ? ["*"] : links.filter((link) => link.role_id === role.id).map((link) => link.code),
      })),
      permissions: permissions.map((permission) => ({ id: permission.id, code: permission.code, name: permission.name, group: permission.group_name })),
    };
  }

  async saveRole({ code, name, description, permissions }) {
    return withTransaction(async (connection) => {
      await connection.execute(
        `INSERT INTO admin_roles (code, name, description, is_system) VALUES (?, ?, ?, FALSE)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
        [code, name, description || null],
      );
      const [[role]] = await connection.execute("SELECT * FROM admin_roles WHERE code = ?", [code]);
      if (role.code === "super_admin") return role;
      await connection.execute("DELETE FROM admin_role_permissions WHERE role_id = ?", [role.id]);
      for (const permission of permissions) {
        await connection.execute(
          `INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
           SELECT ?, id FROM admin_permissions WHERE code = ?`,
          [role.id, permission],
        );
      }
      return role;
    });
  }

  async listAdminUsers() {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
       GROUP_CONCAT(DISTINCT r.code ORDER BY r.name SEPARATOR ',') AS role_codes
       FROM users u LEFT JOIN admin_user_roles aur ON aur.user_id = u.id
       LEFT JOIN admin_roles r ON r.id = aur.role_id
       WHERE u.role = 'admin' GROUP BY u.id ORDER BY u.created_at DESC`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      createdAt: row.created_at,
      roles: row.role_codes ? row.role_codes.split(",") : [],
    }));
  }

  async setUserRoles(userId, roleCodes) {
    return withTransaction(async (connection) => {
      const [[user]] = await connection.execute("SELECT id, role FROM users WHERE id = ?", [userId]);
      if (!user || user.role !== "admin") return null;
      await connection.execute("DELETE FROM admin_user_roles WHERE user_id = ?", [userId]);
      for (const code of roleCodes) {
        await connection.execute(
          `INSERT IGNORE INTO admin_user_roles (user_id, role_id) SELECT ?, id FROM admin_roles WHERE code = ?`,
          [userId, code],
        );
      }
      return this.getAuthorization(userId);
    });
  }

  async listSettings() {
    const [rows] = await pool.query("SELECT setting_group, setting_value, updated_at FROM store_settings ORDER BY setting_group");
    return Object.fromEntries(rows.map((row) => [row.setting_group, { ...safeJson(row.setting_value), updatedAt: row.updated_at }]));
  }

  async saveSetting(group, value, userId) {
    await pool.execute(
      `INSERT INTO store_settings (setting_group, setting_value, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
      [group, JSON.stringify(value), userId],
    );
    return value;
  }

  async publicStorefrontConfig() {
    const settings = await this.listSettings();
    return {
      identity: settings.identity || DEFAULT_SETTINGS.identity,
      appearance: settings.appearance || DEFAULT_SETTINGS.appearance,
      commerce: settings.commerce || DEFAULT_SETTINGS.commerce,
      checkout: settings.checkout || DEFAULT_SETTINGS.checkout,
      seo: settings.seo || DEFAULT_SETTINGS.seo,
    };
  }

  async listIntegrations() {
    const [rows] = await pool.query("SELECT * FROM integration_connections ORDER BY provider");
    return rows.map((row) => ({
      provider: row.provider,
      status: row.status,
      publicConfig: safeJson(row.public_config_json),
      discovered: safeJson(row.discovered_json),
      secretsConfigured: Boolean(row.encrypted_secrets),
      lastError: row.last_error,
      lastTestedAt: row.last_tested_at,
      updatedAt: row.updated_at,
    }));
  }

  async getIntegration(provider) {
    const [[row]] = await pool.execute("SELECT * FROM integration_connections WHERE provider = ?", [provider]);
    if (!row) return null;
    return {
      provider: row.provider,
      status: row.status,
      publicConfig: safeJson(row.public_config_json),
      secrets: this.vault.decrypt(row.encrypted_secrets, {}),
      discovered: safeJson(row.discovered_json),
      lastError: row.last_error,
      lastTestedAt: row.last_tested_at,
    };
  }

  async saveIntegration(provider, { publicConfig = {}, secrets = {} }, userId) {
    const existing = await this.getIntegration(provider);
    const mergedSecrets = { ...(existing?.secrets || {}), ...Object.fromEntries(Object.entries(secrets).filter(([, value]) => value !== "" && value != null)) };
    await pool.execute(
      `INSERT INTO integration_connections (provider, status, public_config_json, encrypted_secrets, updated_by)
       VALUES (?, 'configured', ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = 'configured', public_config_json = VALUES(public_config_json),
       encrypted_secrets = VALUES(encrypted_secrets), updated_by = VALUES(updated_by), last_error = NULL`,
      [provider, JSON.stringify(publicConfig), this.vault.encrypt(mergedSecrets), userId],
    );
    return this.getIntegration(provider);
  }

  async setIntegrationResult(provider, { status, discovered = {}, error = null }) {
    await pool.execute(
      `UPDATE integration_connections SET status = ?, discovered_json = ?, last_error = ?, last_tested_at = NOW() WHERE provider = ?`,
      [status, JSON.stringify(discovered), error, provider],
    );
  }

  async disconnectIntegration(provider) {
    await pool.execute("DELETE FROM integration_connections WHERE provider = ?", [provider]);
  }

  async linkOAuthAccount({ userId, provider, providerUserId, email }) {
    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), email = VALUES(email), updated_at = CURRENT_TIMESTAMP`,
      [id, userId, provider, providerUserId, email.toLowerCase()],
    );
  }

  async audit({ actorUserId = null, action, entityType, entityId = null, metadata = {}, ipAddress = null, userAgent = null }) {
    await pool.execute(
      `INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [actorUserId, action, entityType, entityId == null ? null : String(entityId), JSON.stringify(metadata), ipAddress, String(userAgent || "").slice(0, 255) || null],
    );
  }

  async listAudit({ limit = 100, offset = 0, query = "" } = {}) {
    const safeLimit = Math.min(250, Math.max(1, Number(limit) || 100));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const term = `%${String(query).trim()}%`;
    const [rows] = await pool.execute(
      `SELECT l.*, u.name AS actor_name, u.email AS actor_email FROM admin_audit_logs l
       LEFT JOIN users u ON u.id = l.actor_user_id
       WHERE (? = '%%' OR l.action LIKE ? OR l.entity_type LIKE ? OR l.entity_id LIKE ? OR u.email LIKE ?)
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [term, term, term, term, term, safeLimit, safeOffset],
    );
    return rows.map((row) => ({
      id: row.id,
      actor: row.actor_user_id ? { id: row.actor_user_id, name: row.actor_name, email: row.actor_email } : null,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: safeJson(row.metadata_json),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    }));
  }
}

export { DEFAULT_SETTINGS, PERMISSIONS, ROLE_DEFINITIONS };
