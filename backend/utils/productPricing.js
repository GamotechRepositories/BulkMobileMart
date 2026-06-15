export function normalizeBulkSlabInput(slabs = []) {
  if (!Array.isArray(slabs)) return [];

  return slabs
    .map((slab) => ({
      maxQuantity:
        slab.maxQuantity === "" || slab.maxQuantity == null
          ? null
          : Number(slab.maxQuantity),
      pricePerUnit: Number(slab.pricePerUnit),
    }))
    .filter(
      (slab) => Number.isFinite(slab.pricePerUnit) && slab.pricePerUnit >= 0
    );
}

export function buildBulkSlabs(minOrderQuantity, rawSlabs = []) {
  const minOrder = Number(minOrderQuantity);
  const entries = normalizeBulkSlabInput(rawSlabs);

  if (!Number.isFinite(minOrder) || minOrder < 1) {
    return { error: "Minimum order quantity is required for bulk pricing" };
  }

  if (entries.length === 0) {
    return { error: "At least one pricing slab is required for bulk pricing" };
  }

  const slabs = [];
  let nextMin = minOrder;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;

    if (!isLast && !Number.isFinite(entry.maxQuantity)) {
      return { error: `Slab ${i + 1} must have a max quantity` };
    }

    if (Number.isFinite(entry.maxQuantity) && entry.maxQuantity < nextMin) {
      return {
        error: `Slab ${i + 1} max quantity must be at least ${nextMin}`,
      };
    }

    slabs.push({
      minQuantity: nextMin,
      maxQuantity: entry.maxQuantity,
      pricePerUnit: entry.pricePerUnit,
    });

    if (Number.isFinite(entry.maxQuantity)) {
      nextMin = entry.maxQuantity + 1;
    }
  }

  return { slabs };
}

export function validateBulkPricing(bulkPricing) {
  const built = buildBulkSlabs(
    bulkPricing?.minOrderQuantity,
    bulkPricing?.slabs
  );

  if (built.error) {
    return { valid: false, message: built.error };
  }

  return {
    valid: true,
    bulkPricing: {
      minOrderQuantity: Number(bulkPricing.minOrderQuantity),
      slabs: built.slabs,
    },
  };
}

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

export function getPricingSource(product, variantName) {
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
    pricingType: product.pricingType,
    bulkPricing: product.bulkPricing,
    price: product.price,
    discountedPrice: product.discountedPrice,
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

export function getMinOrderQuantity(product, variantName = "") {
  const source = getPricingSource(product, variantName);
  if (!source) return 1;

  if (source.pricingType === "bulk" && source.bulkPricing?.minOrderQuantity) {
    return source.bulkPricing.minOrderQuantity;
  }

  return 1;
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

export function deriveSinglePriceFieldsFromBulk(bulkPricing) {
  const slabs = bulkPricing.slabs;
  const minUnit = Math.min(...slabs.map((slab) => slab.pricePerUnit));
  const maxUnit = Math.max(...slabs.map((slab) => slab.pricePerUnit));

  return {
    price: maxUnit,
    discountedPrice: minUnit,
    discountedPercent:
      maxUnit > 0 ? Math.round(((maxUnit - minUnit) / maxUnit) * 100) : 0,
  };
}

export function resolvePricingFields(payload) {
  if (payload.pricingType === "bulk") {
    const bulkCheck = validateBulkPricing(payload.bulkPricing);
    if (!bulkCheck.valid) {
      return { error: bulkCheck.message };
    }

    const derived = deriveSinglePriceFieldsFromBulk(bulkCheck.bulkPricing);

    return {
      pricingType: "bulk",
      bulkPricing: bulkCheck.bulkPricing,
      price: derived.price,
      discountedPrice: derived.discountedPrice,
      discountedPercent: derived.discountedPercent,
    };
  }

  const missing = [];
  if (payload.price === undefined || payload.price === null || payload.price === "") {
    missing.push("price");
  }
  if (
    payload.discountedPrice === undefined ||
    payload.discountedPrice === null ||
    payload.discountedPrice === ""
  ) {
    missing.push("discountedPrice");
  }

  if (missing.length > 0) {
    return {
      error: `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required for single pricing`,
    };
  }

  const price = Number(payload.price);
  const discountedPrice = Number(payload.discountedPrice);
  const discountedPercent =
    payload.discountedPercent === undefined ||
    payload.discountedPercent === null ||
    payload.discountedPercent === ""
      ? price > 0
        ? Math.round(((price - discountedPrice) / price) * 100)
        : 0
      : Number(payload.discountedPercent);

  return {
    pricingType: "single",
    bulkPricing: { minOrderQuantity: null, slabs: [] },
    price,
    discountedPrice,
    discountedPercent: Math.max(0, Math.min(100, discountedPercent)),
  };
}

export const PRODUCT_PRICING_SELECT =
  "name brandName price discountedPrice discountedPercent productImages stock subcategory pricingType bulkPricing variantType variants colors isActive";
