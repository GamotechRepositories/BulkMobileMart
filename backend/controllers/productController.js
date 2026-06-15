import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { resolvePricingFields } from "../utils/productPricing.js";

const MOST_PURCHASE_TAG = "Most Purchase";

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeImages = (productImages, images) => {
  const source = productImages ?? images;
  if (!Array.isArray(source)) return [];
  return source
    .map((img) => (typeof img === "string" ? img.trim() : ""))
    .filter(Boolean);
};

const normalizeFeatures = (features) => {
  if (!Array.isArray(features)) return [];
  return features
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const normalizeColors = (colors) => {
  if (!Array.isArray(colors)) return [];

  return colors
    .map((color) => {
      if (typeof color === "string") {
        const name = color.trim();
        return name ? { name, hex: "#cccccc" } : null;
      }

      const name = color?.name?.trim();
      if (!name) return null;

      const hex = color?.hex?.trim() || "#cccccc";
      return { name, hex };
    })
    .filter(Boolean);
};

const normalizeCategories = (categories, categoryName, category) => {
  let list = [];

  if (Array.isArray(categories)) {
    list = categories
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  } else if (Array.isArray(categoryName)) {
    list = categoryName
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  } else if (typeof categoryName === "string" && categoryName.trim()) {
    list = [categoryName.trim()];
  } else if (typeof category === "string" && category.trim()) {
    list = [category.trim()];
  }

  const unique = [];
  const seen = new Set();

  list.forEach((name) => {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  });

  return unique;
};

const findCategoryByName = async (categoryName) =>
  Category.findOne({
    categoryName: {
      $regex: new RegExp(`^${escapeRegex(categoryName.trim())}$`, "i"),
    },
  });

const validateCategoriesAndSubcategory = async (categories, subcategory) => {
  const trimmedSub = subcategory?.trim();

  if (!categories.length) {
    return { valid: false, message: "At least one category is required" };
  }

  if (!trimmedSub) {
    return { valid: false, message: "Subcategory name is required" };
  }

  const mainCategoryName = categories[0];
  const mainCategory = await findCategoryByName(mainCategoryName);

  if (!mainCategory) {
    return {
      valid: false,
      message: `Main category "${mainCategoryName}" not found`,
    };
  }

  const matchedSub = mainCategory.subcategories.find(
    (sub) => sub.toLowerCase() === trimmedSub.toLowerCase()
  );

  if (!matchedSub && mainCategory.subcategories.length > 0) {
    return {
      valid: false,
      message: `Subcategory must be one of: ${mainCategory.subcategories.join(", ")}`,
    };
  }

  const normalizedCategories = [];

  for (const categoryName of categories) {
    const categoryDoc = await findCategoryByName(categoryName);

    if (!categoryDoc) {
      return {
        valid: false,
        message: `Category "${categoryName}" not found`,
      };
    }

    normalizedCategories.push(categoryDoc.categoryName);
  }

  return {
    valid: true,
    categories: normalizedCategories,
    subcategory: matchedSub || trimmedSub,
  };
};

const buildProductPayload = (body) => {
  const variantType = body.variantType === "multi" ? "multi" : "single";
  const pricingType = body.pricingType === "bulk" ? "bulk" : "single";

  return {
    name: body.name?.trim(),
    categories: normalizeCategories(
      body.categories,
      body.categoryName,
      body.category
    ),
    subcategory: body.subcategory?.trim(),
    brandName: (body.brandName ?? body.brand)?.trim(),
    variantType,
    variants: Array.isArray(body.variants)
      ? body.variants.map((variant) => ({
          name: variant.name?.trim(),
          pricingType: variant.pricingType === "bulk" ? "bulk" : "single",
          bulkPricing:
            variant.pricingType === "bulk"
              ? {
                  minOrderQuantity: variant.bulkPricing?.minOrderQuantity,
                  slabs: variant.bulkPricing?.slabs || [],
                }
              : { minOrderQuantity: null, slabs: [] },
          price: variant.price,
          discountedPrice: variant.discountedPrice,
          discountedPercent: variant.discountedPercent,
          stock: variant.stock,
          colors: normalizeColors(variant.colors),
        }))
      : [],
    pricingType,
    bulkPricing:
      pricingType === "bulk"
        ? {
            minOrderQuantity: body.bulkPricing?.minOrderQuantity,
            slabs: body.bulkPricing?.slabs || [],
          }
        : { minOrderQuantity: null, slabs: [] },
    price: body.price ?? body.original_price,
    discountedPrice: body.discountedPrice ?? body.discounted_price,
    discountedPercent: body.discountedPercent ?? body.discount_percent,
    ratings: body.ratings,
    stock: body.stock,
    colors: normalizeColors(body.colors),
    productImages: normalizeImages(body.productImages, body.images),
    description: body.description?.trim() ?? "",
    features: normalizeFeatures(body.features),
    warranty: body.warranty?.trim() ?? "",
    isActive: body.isActive,
  };
};

const resolveProductPricing = (payload) => {
  if (payload.variantType === "multi") {
    const namedVariants = payload.variants.filter((variant) => variant.name);

    if (namedVariants.length < 2) {
      return { error: "At least 2 variants are required for multi variant products" };
    }

    const names = new Set();
    for (const variant of namedVariants) {
      const key = variant.name.toLowerCase();
      if (names.has(key)) {
        return { error: `Duplicate variant name "${variant.name}"` };
      }
      names.add(key);
    }

    const resolvedVariants = [];

    for (const variant of namedVariants) {
      const stock = Number(variant.stock);
      if (!Number.isFinite(stock) || stock < 0) {
        return { error: `Variant "${variant.name}": stock is required` };
      }

      const pricing = resolvePricingFields({
        pricingType: variant.pricingType,
        bulkPricing: variant.bulkPricing,
        price: variant.price,
        discountedPrice: variant.discountedPrice,
        discountedPercent: variant.discountedPercent,
      });

      if (pricing.error) {
        return { error: `Variant "${variant.name}": ${pricing.error}` };
      }

      resolvedVariants.push({
        name: variant.name,
        pricingType: pricing.pricingType,
        bulkPricing: pricing.bulkPricing,
        price: pricing.price,
        discountedPrice: pricing.discountedPrice,
        discountedPercent: pricing.discountedPercent,
        stock,
        colors: normalizeColors(variant.colors),
      });
    }

    const totalStock = resolvedVariants.reduce(
      (sum, variant) => sum + variant.stock,
      0
    );

    const minDiscounted = Math.min(
      ...resolvedVariants.map((variant) => variant.discountedPrice)
    );
    const maxPrice = Math.max(...resolvedVariants.map((variant) => variant.price));
    const hasBulk = resolvedVariants.some((variant) => variant.pricingType === "bulk");

    return {
      variantType: "multi",
      variants: resolvedVariants,
      stock: totalStock,
      colors: [],
      pricingType: hasBulk ? "bulk" : "single",
      bulkPricing: { minOrderQuantity: null, slabs: [] },
      price: maxPrice,
      discountedPrice: minDiscounted,
      discountedPercent:
        maxPrice > 0
          ? Math.round(((maxPrice - minDiscounted) / maxPrice) * 100)
          : 0,
    };
  }

  const pricing = resolvePricingFields(payload);
  if (pricing.error) {
    return { error: pricing.error };
  }

  return {
    variantType: "single",
    variants: [],
    stock: payload.stock,
    colors: normalizeColors(payload.colors),
    pricingType: pricing.pricingType,
    bulkPricing: pricing.bulkPricing,
    price: pricing.price,
    discountedPrice: pricing.discountedPrice,
    discountedPercent: pricing.discountedPercent,
  };
};

const validateRequiredFields = (payload) => {
  const missing = [];

  if (!payload.name) missing.push("name");
  if (!payload.categories.length) missing.push("categories");
  if (payload.categories.length > 4) missing.push("categories (max 4)");
  if (!payload.subcategory) missing.push("subcategory");
  if (!payload.brandName) missing.push("brandName");
  if (payload.variantType !== "multi") {
    if (payload.stock === undefined || payload.stock === null || payload.stock === "") {
      missing.push("stock");
    }
  }
  if (!payload.productImages.length) missing.push("productImages");

  if (missing.length > 0) {
    return `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`;
  }

  return null;
};

const sortOptions = { "categories.0": 1, subcategory: 1, createdAt: -1 };

export const getProducts = async (req, res) => {
  try {
    const filter = { isActive: true };

    if (
      req.query.mostPurchase === "true" ||
      req.query.categoryName?.trim().toLowerCase() ===
        MOST_PURCHASE_TAG.toLowerCase()
    ) {
      filter.categories = MOST_PURCHASE_TAG;
    } else if (req.query.categoryName?.trim()) {
      filter.categories = req.query.categoryName.trim();
    }

    if (req.query.subcategory?.trim()) {
      filter.subcategory = {
        $regex: new RegExp(
          `^${escapeRegex(req.query.subcategory.trim())}$`,
          "i"
        ),
      };
    }

    if (req.query.q?.trim()) {
      const term = escapeRegex(req.query.q.trim());
      const regex = new RegExp(term, "i");
      filter.$or = [
        { name: regex },
        { brandName: regex },
        { subcategory: regex },
        { categories: regex },
        { description: regex },
      ];
    }

    if (req.query.brandName?.trim()) {
      filter.brandName = {
        $regex: new RegExp(
          `^${escapeRegex(req.query.brandName.trim())}$`,
          "i"
        ),
      };
    }

    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      filter.discountedPrice = {};
      if (Number.isFinite(minPrice)) filter.discountedPrice.$gte = minPrice;
      if (Number.isFinite(maxPrice)) filter.discountedPrice.$lte = maxPrice;
    }

    let sort = sortOptions;
    const sortParam = String(req.query.sort || "").trim();
    if (sortParam === "price-asc") sort = { discountedPrice: 1, name: 1 };
    else if (sortParam === "price-desc") sort = { discountedPrice: -1, name: 1 };
    else if (sortParam === "name") sort = { name: 1 };
    else if (sortParam === "brand") sort = { brandName: 1, name: 1 };

    let query = Product.find(filter).sort(sort);

    if (req.query.limit) {
      const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);
      query = query.limit(limit);
    }

    const products = await query;
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort(sortOptions);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addProduct = async (req, res) => {
  try {
    const payload = buildProductPayload(req.body);
    const requiredError = validateRequiredFields(payload);

    if (requiredError) {
      return res.status(400).json({ success: false, message: requiredError });
    }

    const categoryCheck = await validateCategoriesAndSubcategory(
      payload.categories,
      payload.subcategory
    );

    if (!categoryCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: categoryCheck.message });
    }

    const pricingFields = resolveProductPricing(payload);
    if (pricingFields.error) {
      return res.status(400).json({ success: false, message: pricingFields.error });
    }

    const product = await Product.create({
      name: payload.name,
      categories: categoryCheck.categories,
      subcategory: categoryCheck.subcategory,
      brandName: payload.brandName,
      variantType: pricingFields.variantType,
      variants: pricingFields.variants,
      pricingType: pricingFields.pricingType,
      bulkPricing: pricingFields.bulkPricing,
      price: pricingFields.price,
      discountedPrice: pricingFields.discountedPrice,
      discountedPercent: pricingFields.discountedPercent,
      ratings: payload.ratings ?? 0,
      stock: pricingFields.stock ?? payload.stock,
      colors: pricingFields.colors ?? [],
      productImages: payload.productImages,
      description: payload.description,
      features: payload.features,
      warranty: payload.warranty,
      isActive: payload.isActive ?? true,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const payload = buildProductPayload({
      name: req.body.name ?? existing.name,
      categories: req.body.categories ?? existing.categories,
      categoryName: req.body.categoryName,
      category: req.body.category,
      subcategory: req.body.subcategory ?? existing.subcategory,
      brandName: req.body.brandName ?? req.body.brand ?? existing.brandName,
      variantType: req.body.variantType ?? existing.variantType,
      variants: req.body.variants ?? existing.variants,
      pricingType: req.body.pricingType ?? existing.pricingType,
      bulkPricing: req.body.bulkPricing ?? existing.bulkPricing,
      price: req.body.price ?? req.body.original_price ?? existing.price,
      discountedPrice:
        req.body.discountedPrice ??
        req.body.discounted_price ??
        existing.discountedPrice,
      discountedPercent:
        req.body.discountedPercent ??
        req.body.discount_percent ??
        existing.discountedPercent,
      ratings: req.body.ratings ?? existing.ratings,
      stock: req.body.stock ?? existing.stock,
      colors: req.body.colors ?? existing.colors,
      productImages:
        req.body.productImages ?? req.body.images ?? existing.productImages,
      description: req.body.description ?? existing.description,
      features: req.body.features ?? existing.features,
      warranty: req.body.warranty ?? existing.warranty,
      isActive: req.body.isActive ?? existing.isActive,
    });

    const requiredError = validateRequiredFields(payload);

    if (requiredError) {
      return res.status(400).json({ success: false, message: requiredError });
    }

    const categoryCheck = await validateCategoriesAndSubcategory(
      payload.categories,
      payload.subcategory
    );

    if (!categoryCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: categoryCheck.message });
    }

    const pricingFields = resolveProductPricing(payload);
    if (pricingFields.error) {
      return res.status(400).json({ success: false, message: pricingFields.error });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: payload.name,
        categories: categoryCheck.categories,
        subcategory: categoryCheck.subcategory,
        brandName: payload.brandName,
        variantType: pricingFields.variantType,
        variants: pricingFields.variants,
        pricingType: pricingFields.pricingType,
        bulkPricing: pricingFields.bulkPricing,
        price: pricingFields.price,
        discountedPrice: pricingFields.discountedPrice,
        discountedPercent: pricingFields.discountedPercent,
        ratings: payload.ratings,
        stock: pricingFields.stock ?? payload.stock,
        colors: pricingFields.colors ?? [],
        productImages: payload.productImages,
        description: payload.description,
        features: payload.features,
        warranty: payload.warranty,
        isActive: payload.isActive,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
