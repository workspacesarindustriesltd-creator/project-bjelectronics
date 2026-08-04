const trimTrailingSlash = (value) => value?.replace(/\/+$/, "");
const isDevelopment = import.meta.env.DEV;

function derivedStoreUrl() {
  if (isDevelopment) return `${window.location.protocol}//${window.location.hostname}:5173`;
  if (window.location.hostname.startsWith("admin.")) {
    return `${window.location.protocol}//www.${window.location.hostname.slice("admin.".length)}`;
  }
  return window.location.origin;
}

function derivedAdminUrl() {
  if (isDevelopment) return `${window.location.protocol}//${window.location.hostname}:5174`;
  return `${window.location.origin}/admin`;
}

export const storefrontUrl = trimTrailingSlash(import.meta.env.VITE_STORE_URL) || derivedStoreUrl();
const configuredAdminUrl = trimTrailingSlash(import.meta.env.VITE_ADMIN_URL) || derivedAdminUrl();
export const adminPortalUrl = configuredAdminUrl.endsWith("/admin")
  ? configuredAdminUrl
  : `${configuredAdminUrl}/admin`;
export const adminLoginUrl = `${adminPortalUrl}/login`;
