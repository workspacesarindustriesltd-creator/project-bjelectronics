function validHex(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function darken(hex, amount = 0.18) {
  const value = validHex(hex, "#2563eb").slice(1);
  const channels = [0, 2, 4].map((index) => Math.max(0, Math.round(parseInt(value.slice(index, index + 2), 16) * (1 - amount))));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function meta(name, content) {
  if (!content) return;
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export async function initializeStorefrontConfig() {
  try {
    const response = await fetch("/api/storefront/config", { credentials: "include", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const config = await response.json();
    const root = document.documentElement;
    const primary = validHex(config.appearance?.primary, "#0f172a");
    const accent = validHex(config.appearance?.accent, "#2563eb");
    const radius = Math.min(32, Math.max(0, Number(config.appearance?.radius) || 14));
    root.style.setProperty("--brand", accent);
    root.style.setProperty("--brand-dark", darken(accent));
    root.style.setProperty("--accent", primary);
    root.style.setProperty("--radius", `${radius}px`);
    root.dataset.storeDensity = config.appearance?.density || "comfortable";
    root.dataset.announcementEnabled = config.appearance?.announcementEnabled ? "true" : "false";
    window.__BJ_STOREFRONT_CONFIG__ = config;

    if (config.seo?.title) document.title = config.seo.title;
    meta("description", config.seo?.description);
    if (config.seo?.indexStorefront === false) meta("robots", "noindex,nofollow");
    window.dispatchEvent(new CustomEvent("bj:storefront-config", { detail: config }));
    return config;
  } catch {
    return null;
  }
}
