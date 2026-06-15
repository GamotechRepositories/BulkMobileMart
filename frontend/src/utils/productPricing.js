const DEFAULT_SINGLE_MOQ = 1;

export function isMultiVariant(product) {
  return product?.variantType === "multi" && Array.isArray(product?.variants) && product.variants.length > 0;
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

export function getVariantStock(product, variantName = "") {
  if (isMultiVariant(product)) {
    const variant = getVariant(product, variantName);
    return variant?.stock ?? 0;
  }

  return product?.stock ?? 0;
}

export function getAvailableColors(product, variantName = "") {
  if (isMultiVariant(product)) {
    const variant = getVariant(product, variantName);
    return Array.isArray(variant?.colors) ? variant.colors : [];
  }

  return Array.isArray(product?.colors) ? product.colors : [];
}

export function getTotalProductStock(product) {
  if (isMultiVariant(product)) {
    return product.variants.reduce(
      (sum, variant) => sum + (Number(variant.stock) || 0),
      0
    );
  }

  return product?.stock ?? 0;
}

export function getPricingSource(product, variantName = "") {
  if (isMultiVariant(product)) {
    const variant = getVariant(product, variantName);
    if (!variant) return null;

    return {
      pricingType: variant.pricingType,
      bulkPricing: variant.bulkPricing,
      price: variant.price,
      discountedPrice: variant.discountedPrice,
    };
  }

  return {
    pricingType: product?.pricingType,
    bulkPricing: product?.bulkPricing,
    price: product?.price,
    discountedPrice: product?.discountedPrice,
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

  if (source.pricingType === "bulk" && source.bulkPricing?.minOrderQuantity) {
    return source.bulkPricing.minOrderQuantity;
  }

  return fallback;
}

export function getDisplayPriceForSource(source) {
  if (!source) return 0;

  if (source.pricingType === "bulk" && source.bulkPricing?.slabs?.length) {
    return Math.min(...source.bulkPricing.slabs.map((slab) => slab.pricePerUnit));
  }

  return source.discountedPrice ?? source.price ?? 0;
}

export function getDisplayPrice(product, variantName = "") {
  if (isMultiVariant(product) && !variantName) {
    return Math.min(
      ...product.variants.map((variant) =>
        getDisplayPriceForSource({
          pricingType: variant.pricingType,
          bulkPricing: variant.bulkPricing,
          price: variant.price,
          discountedPrice: variant.discountedPrice,
        })
      )
    );
  }

  return getDisplayPriceForSource(getPricingSource(product, variantName));
}

export function isBulkPricing(product, variantName = "") {
  const source = getPricingSource(product, variantName);
  return source?.pricingType === "bulk" && source.bulkPricing?.slabs?.length > 0;
}

export function getBulkTierRows(product, variantName = "") {
  const source = getPricingSource(product, variantName);
  if (!source || source.pricingType !== "bulk" || !source.bulkPricing?.slabs?.length) {
    return [];
  }

  return source.bulkPricing.slabs.map((slab) => ({
    key: `${slab.minQuantity}-${slab.maxQuantity ?? "plus"}`,
    qty: slab.maxQuantity
      ? `${slab.minQuantity} - ${slab.maxQuantity}`
      : `${slab.minQuantity}+`,
    price: slab.pricePerUnit,
  }));
}

export function formatProductPriceLabel(product, formatPrice, variantName = "") {
  const amount = getDisplayPrice(product, variantName);
  if (isBulkPricing(product, variantName) || (isMultiVariant(product) && !variantName)) {
    return `From ${formatPrice(amount)}`;
  }

  return formatPrice(amount);
}

export function buildProductPricingView(product, variantName = "") {
  const source = getPricingSource(product, variantName);
  if (!source) return null;

  return {
    pricingType: source.pricingType,
    bulkPricing: source.bulkPricing,
    price: source.price,
    discountedPrice: source.discountedPrice,
  };
}
