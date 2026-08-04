
const acceptsHtml = (request) => request.headers.get("accept")?.includes("text/html");
const isNavigation = (request) => ["GET", "HEAD"].includes(request.method) && acceptsHtml(request);
const isAdminSurface = (url) => url.hostname.startsWith("admin.") || url.pathname.startsWith("/admin");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isNavigation(request) && url.hostname.startsWith("admin.") && url.pathname === "/") {
      const adminUrl = new URL(request.url);
      adminUrl.pathname = "/admin/index.html";
      adminUrl.search = "";
      return env.ASSETS.fetch(new Request(adminUrl, request));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !isNavigation(request) || url.pathname.startsWith("/api/")) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = isAdminSurface(url) ? "/admin/index.html" : "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
