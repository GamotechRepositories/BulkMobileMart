const DEFAULT_SINGLE_MOQ = 1;

export function isMultiVariant(product) {
  return (
    product?.variantType === "multi" &&
    Array.isArray(product?.variants) &&
    product.variants.length > 0
  );
}

export function getVariant(product, variantName) {
  if (!isMultiVariant(product) || !variantName) return null;

  const target = String(variantName).trim().toLowerCase();
  return (
    product.variants.find(
      (variant) => variant.name?.trim().toLowerCase() === target
    ) || null
  );
}

export function getAvailableColors(product, variantName = "") {
  if (isMultiVariant(product)) {
    const variant = getVariant(product, variantName);
    return Array.isArray(variant?.colors) ? variant.colors : [];
  }

  return Array.isArray(product?.colors) ? product.colors : [];
}

export function getPricingSource(product, variantName = "") {
  const productMoq =
    product?.minOrderQuantity ?? product?.bulkPricing?.minOrderQuantity ?? null;
  const productStep =
    product?.stepByQuantity ?? product?.bulkPricing?.stepByQuantity ?? null;

  if (isMultiVariant(product)) {
    const variant = getVariant(product, variantName);
    if (!variant) return null;

    return {
      pricingType: variant.pricingType,
      bulkPricing: variant.bulkPricing,
      price: variant.price,
      discountedPrice: variant.discountedPrice,
      minOrderQuantity:
        productMoq ??
        variant.minOrderQuantity ??
        variant.bulkPricing?.minOrderQuantity ??
        null,
      stepByQuantity:
        productStep ??
        variant.stepByQuantity ??
        variant.bulkPricing?.stepByQuantity ??
        null,
    };
  }

  return {
    pricingType: product?.pricingType,
    bulkPricing: product?.bulkPricing,
    price: product?.price,
    discountedPrice: product?.discountedPrice,
    minOrderQuantity: productMoq,
    stepByQuantity: productStep,
  };
}

export function getUnitPriceForQuantity(product, quantity, variantName = "") {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) return 0;

  const source = getPricingSource(product, variantName);
  if (!source) return 0;

  if (source.pricingType === "bulk" && source.bulkPricing?.slabs?.length) {
    const slabs = [...source.bulkPricing.slabs].sort(
      (a, b) => a.minQuantity - b.minQuantity
    );

    for (let i = slabs.length - 1; i >= 0; i -= 1) {
      const slab = slabs[i];
      const inRange =
        qty >= slab.minQuantity &&
        (slab.maxQuantity == null || qty <= slab.maxQuantity);

      if (inRange) return slab.pricePerUnit;
    }

    return slabs[slabs.length - 1]?.pricePerUnit ?? 0;
  }

  return source.discountedPrice ?? source.price ?? 0;
}

export function getMinOrderQuantity(product, variantName = "", fallback = DEFAULT_SINGLE_MOQ) {
  const source = getPricingSource(product, variantName);
  if (!source) return fallback;

  const moq = Number(source.minOrderQuantity);
  if (Number.isFinite(moq) && moq > 0) {
    return moq;
  }

  return fallback;
}

export function getCartAdjustStep(product, variantName = "", fallback = DEFAULT_SINGLE_MOQ) {
  const source = getPricingSource(product, variantName);
  if (!source) return fallback;

  const step = Number(source.stepByQuantity);
  if (Number.isFinite(step) && step > 0) {
    return step;
  }

  const moq = Number(source.minOrderQuantity);
  if (Number.isFinite(moq) && moq > 0) {
    return moq;
  }

  return fallback;
}

export function buildLineItemKey(productId, variantName = "", colorName = "") {
  return `${productId}::${variantName}::${colorName}`;
}
