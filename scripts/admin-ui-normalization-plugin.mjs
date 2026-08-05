export function normalizeAdminUiSource(source) {
  return source
    .replace("Activity, ArrowRight", "ChartLineUp, ArrowRight")
    .replaceAll("<Activity", "<ChartLineUp");
}

export function adminUiNormalizationPlugin() {
  return {
    name: "bj-admin-ui-normalization",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]src[\\/]admin[\\/]AdminPortal\.jsx$/.test(id)) return null;
      const normalized = normalizeAdminUiSource(code);
      if (normalized.includes("<Activity") || normalized.includes("Activity, ArrowRight")) {
        throw new Error("Administrator UI normalization did not replace the unsupported icon.");
      }
      return { code: normalized, map: null };
    },
  };
}
