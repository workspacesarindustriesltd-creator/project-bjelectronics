import crypto from "node:crypto";

const SUPPORTED_RESOURCE_TYPES = new Set(["image", "video"]);
const SUPPORTED_SIGNATURE_ALGORITHMS = new Set(["sha1", "sha256"]);

function normalizedBoolean(value) {
  return value ? "true" : "false";
}

export function serializeCloudinarySignatureParams(parameters) {
  return Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : value}`)
    .join("&");
}

export function signCloudinaryParameters(parameters, apiSecret, algorithm = "sha256") {
  if (!SUPPORTED_SIGNATURE_ALGORITHMS.has(algorithm)) {
    throw new Error("Cloudinary signature algorithm must be sha1 or sha256.");
  }
  const serialized = serializeCloudinarySignatureParams(parameters);
  return crypto.createHash(algorithm).update(`${serialized}${apiSecret}`).digest("hex");
}

function serviceUnavailable(message) {
  return Object.assign(new Error(message), { status: 503 });
}

export function optimizeCloudinaryDeliveryUrl(url, { width = 1600 } = {}) {
  if (!url || !url.includes("/upload/")) return url;
  const safeWidth = Math.min(3200, Math.max(320, Number(width) || 1600));
  return url.replace("/upload/", `/upload/f_auto,q_auto:good,c_limit,w_${safeWidth}/`);
}

export function createCloudinaryMediaService({
  cloudName,
  apiKey,
  apiSecret,
  folder = "bj-electronics/products",
  signatureAlgorithm = "sha256",
  clock = () => Date.now(),
} = {}) {
  const values = [cloudName, apiKey, apiSecret].map((value) => value?.trim() || "");
  const configuredCount = values.filter(Boolean).length;
  if (configuredCount > 0 && configuredCount < 3) {
    throw new Error("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be configured together.");
  }
  if (!SUPPORTED_SIGNATURE_ALGORITHMS.has(signatureAlgorithm)) {
    throw new Error("CLOUDINARY_SIGNATURE_ALGORITHM must be sha1 or sha256.");
  }

  const [normalizedCloudName, normalizedApiKey, normalizedApiSecret] = values;
  const enabled = configuredCount === 3;
  const normalizedFolder = String(folder || "bj-electronics/products").trim().replace(/^\/+|\/+$/g, "");

  return {
    enabled,
    createUploadSignature({ resourceType = "image" } = {}) {
      if (!enabled) {
        throw serviceUnavailable("Cloudinary media storage is not configured.");
      }
      if (!SUPPORTED_RESOURCE_TYPES.has(resourceType)) {
        throw Object.assign(new Error("Unsupported Cloudinary resource type."), { status: 400 });
      }

      const parameters = {
        folder: normalizedFolder,
        overwrite: normalizedBoolean(false),
        timestamp: Math.floor(clock() / 1000),
        unique_filename: normalizedBoolean(true),
        use_filename: normalizedBoolean(true),
      };

      return {
        apiKey: normalizedApiKey,
        cloudName: normalizedCloudName,
        folder: normalizedFolder,
        parameters,
        resourceType,
        signature: signCloudinaryParameters(parameters, normalizedApiSecret, signatureAlgorithm),
        signatureAlgorithm,
        uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(normalizedCloudName)}/${resourceType}/upload`,
      };
    },
    optimizeDeliveryUrl: optimizeCloudinaryDeliveryUrl,
    async health() {
      return { status: enabled ? "configured" : "disabled" };
    },
  };
}
