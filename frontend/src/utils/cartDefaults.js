import {
  getAvailableColors,
  getMinOrderQuantity,
  isMultiVariant,
  isProductInStock,
} from "./productPricing";

export function resolveCartDefaults(product) {
  let variantName = "";
  if (isMultiVariant(product)) {
    const firstInStockVariant = product.variants.find((variant) =>
      isProductInStock(product, variant.name)
    );
    variantName = firstInStockVariant?.name || product.variants?.[0]?.name || "";
  }

  const availableColors = getAvailableColors(product, variantName);
  const colorName = availableColors[0]?.name || "";
  const quantity = getMinOrderQuantity(product, variantName, 1);

  return { variantName, colorName, quantity };
}

export function getCartStepForProduct(product, variantName = "") {
  return getMinOrderQuantity(product, variantName, 1);
}

export function getCartStepForItem(item) {
  if (!item) return 1;

  return getMinOrderQuantity(
    {
      pricingType: item.pricingType,
      bulkPricing: item.bulkPricing,
      variantType: item.variantType,
      variants: item.variants,
    },
    item.variantName || "",
    1
  );
}

export function getDecreasedCartQuantity(currentQty, step) {
  const qty = Number(currentQty) || 0;
  const moq = Number(step) || 1;
  if (qty <= moq) return 0;
  return qty - moq;
}
