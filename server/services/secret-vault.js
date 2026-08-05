import crypto from "node:crypto";

const VERSION = "v1";

function deriveKey(secret) {
  if (!secret || String(secret).length < 16) {
    throw new Error("Administrator vault encryption requires a sufficiently long secret.");
  }
  return crypto.createHash("sha256").update(`bj-electronics-admin-vault:${secret}`).digest();
}

export class SecretVault {
  constructor(secret) {
    this.key = deriveKey(secret);
  }

  encrypt(value) {
    if (value === undefined || value === null) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(value), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
  }

  decrypt(payload, fallback = {}) {
    if (!payload) return fallback;
    try {
      const [version, iv, tag, encrypted] = String(payload).split(".");
      if (version !== VERSION || !iv || !tag || !encrypted) throw new Error("Unsupported vault payload.");
      const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv, "base64url"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64url")),
        decipher.final(),
      ]);
      return JSON.parse(plaintext.toString("utf8"));
    } catch {
      return fallback;
    }
  }
}

export function maskSecret(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 8) return "••••••••";
  return `${text.slice(0, 3)}••••${text.slice(-3)}`;
}
