const malformedOrderDetail = '</small></div></article></dl></CardContent></Card><Field label="Fulfillment status">';
const normalizedOrderDetail = '</small></div></article></dl></div></CardContent></Card><Field label="Fulfillment status">';

export function transformAdminEnterpriseSource(source) {
  if (!source.includes(malformedOrderDetail)) return source;
  return source.replace(malformedOrderDetail, normalizedOrderDetail);
}

export function adminEnterpriseNormalizationPlugin() {
  return {
    name: "bj-admin-enterprise-normalization",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]src[\\/]admin-enterprise[\\/]AdminEnterprise\.jsx$/.test(id)) return null;
      const normalized = transformAdminEnterpriseSource(code);
      return normalized === code ? null : { code: normalized, map: null };
    },
  };
}
