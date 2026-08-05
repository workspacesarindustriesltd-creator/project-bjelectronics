const malformedWishlistIcon = '<Heart weight={wished ? "fill" : "regular" />';
const correctedWishlistIcon = '<Heart weight={wished ? "fill" : "regular"} />';

export function normalizeStoreUiSource(source) {
  if (!source.includes(malformedWishlistIcon)) return source;
  const normalized = source.replaceAll(malformedWishlistIcon, correctedWishlistIcon);
  if (normalized.includes(malformedWishlistIcon)) {
    throw new Error("Store UI normalization did not correct the wishlist icon expression.");
  }
  return normalized;
}

export function storeUiNormalizationPlugin() {
  return {
    name: "bj-store-ui-normalization",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]src[\\/]store[\\/]StoreApp\.jsx$/.test(id)) return null;
      return { code: normalizeStoreUiSource(code), map: null };
    },
  };
}
