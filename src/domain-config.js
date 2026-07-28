const trimTrailingSlash = (value) => value?.replace(/\/+$/, "");
const isLocalHost = ["localhost", "127.0.0.1", "terminal.local"].includes(window.location.hostname);

function derivedStoreUrl() {
  if (isLocalHost) return window.location.origin;
  if (window.location.hostname.startsWith("admin.")) {
    return `${window.location.protocol}//www.${window.location.hostname.slice("admin.".length)}`;
  }
  return window.location.origin;
}

function derivedAdminUrl() {
  if (isLocalHost) return window.location.origin;
  if (window.location.hostname.startsWith("www.")) {
    return `${window.location.protocol}//admin.${window.location.hostname.slice("www.".length)}`;
  }
  return window.location.origin;
}

export const storefrontUrl = trimTrailingSlash(import.meta.env.VITE_STORE_URL) || derivedStoreUrl();
export const adminPortalUrl = trimTrailingSlash(import.meta.env.VITE_ADMIN_URL) || derivedAdminUrl();
export const adminLoginUrl = `${adminPortalUrl}/admin/login`;

