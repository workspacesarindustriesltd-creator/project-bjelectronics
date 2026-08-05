let csrfTokenPromise;

function isSafeMethod(method) {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

async function getCsrfToken(force = false) {
  if (force) csrfTokenPromise = undefined;
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch("/api/csrf-token", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.csrfToken) {
          throw new Error(body.error || "Could not initialize request security.");
        }
        return body.csrfToken;
      })
      .catch((error) => {
        csrfTokenPromise = undefined;
        throw error;
      });
  }
  return csrfTokenPromise;
}

export class ApiError extends Error {
  constructor(message, { status = 500, code = "API_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}, retryCsrf = true) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  let body = options.body;
  if (body !== undefined && body !== null && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  } else if (typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!isSafeMethod(method)) headers.set("X-CSRF-Token", await getCsrfToken());

  let response;
  try {
    response = await fetch(path, {
      credentials: "include",
      ...options,
      method,
      headers,
      body,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError("The service is temporarily unreachable. Check your connection and try again.", {
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = response.status === 204
    ? null
    : contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => "");

  if (response.status === 403 && payload?.code === "CSRF_TOKEN_INVALID" && retryCsrf) {
    await getCsrfToken(true);
    return apiRequest(path, options, false);
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error || payload?.message || `Request failed with status ${response.status}.`,
      {
        status: response.status,
        code: payload?.code || "API_ERROR",
        details: payload?.details || null,
      },
    );
  }

  return payload;
}

export function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }
}

export function slugify(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function money(value, currency = "BDT") {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "BDT" ? 0 : 2,
  }).format(Number(value) || 0);
}

export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    ...options,
  }).format(date);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
