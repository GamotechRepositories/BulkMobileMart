/**
 * Returns canonical SKU for a product.
 * Uses product.sku if provided, otherwise generates fallback SKU format.
 */
export function getProductSku(product) {
  if (!product) return "";
  if (typeof product.sku === "string" && product.sku.trim()) {
    return product.sku.trim().toUpperCase();
  }
  const code = (product.subcategory || product.brandName || "SKU")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  const shortId = product._id ? String(product._id).slice(-6).toUpperCase() : "";
  return `BMM-${code}${shortId ? `-${shortId}` : ""}`;
}
