import Product from "../models/Product.js";

/**
 * Utility to strip HTML tags and normalize whitespace for Meta feed descriptions
 */
const stripHtml = (html = "") => {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Helper to escape special XML characters
 */
const escapeXml = (unsafe = "") => {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/**
 * Helper to escape values for CSV output
 */
const escapeCsv = (value = "") => {
  if (value == null) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Formats price for Meta Catalog (e.g., "999.00 INR")
 */
const formatPrice = (price, currency = "INR") => {
  const num = Number(price);
  if (isNaN(num)) return `0.00 ${currency}`;
  return `${num.toFixed(2)} ${currency}`;
};

/**
 * Validate optional secret token if META_ADS_FEED_SECRET is set in env
 */
const checkSecretAuth = (req) => {
  const secretEnv = process.env.META_ADS_FEED_SECRET;
  if (!secretEnv) return true; // Public access if no secret set in env
  const reqSecret = req.query.secret || req.headers["x-meta-feed-secret"];
  return reqSecret === secretEnv;
};

/**
 * Helper to get the canonical SKU for a product.
 * Uses product.sku (trimmed and uppercase) if available,
 * or generates a consistent fallback SKU format.
 */
const getProductSku = (product) => {
  if (product?.sku && typeof product.sku === "string" && product.sku.trim()) {
    return product.sku.trim().toUpperCase();
  }
  const code = (product?.subcategory || product?.brandName || "SKU")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  const shortId = product?._id ? product._id.toString().slice(-6).toUpperCase() : "";
  return `BMM-${code}${shortId ? `-${shortId}` : ""}`;
};

/**
 * Converts product doc (and optional variant) into standardized Meta Product Feed object
 */
const buildMetaProductItem = (product, variant = null, baseUrl = "", currency = "INR") => {
  const productId = product._id ? product._id.toString() : "";
  const sku = getProductSku(product);

  let itemId = sku;
  let title = product.name || "";
  let price = product.price || 0;
  let salePrice = product.discountedPrice || 0;
  let stock = product.stock ?? 0;
  let inStock = product.inStock && stock > 0;

  if (variant) {
    const variantSlug = (variant.name || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-");
    itemId = `${sku}_${variantSlug}`;
    title = `${product.name} (${variant.name})`;
    if (variant.price) price = variant.price;
    if (variant.discountedPrice) salePrice = variant.discountedPrice;
    if (typeof variant.stock === "number") stock = variant.stock;
    if (typeof variant.inStock === "boolean") inStock = variant.inStock && stock > 0;
  }

  const rawDescription = product.description || title;
  const description = stripHtml(rawDescription);
  const isAvailable = product.isActive && inStock;
  const availability = isAvailable ? "in stock" : "out of stock";
  const link = `${baseUrl.replace(/\/$/, "")}/product/${productId}`;
  const images = Array.isArray(product.productImages) ? product.productImages.filter(Boolean) : [];
  const imageLink = images[0] || "";
  const additionalImageLink = images.slice(1, 10).join(",");

  const categoryList = Array.isArray(product.categories) ? product.categories : [];
  const productType = [...categoryList, product.subcategory].filter(Boolean).join(" > ");
  const googleCategory = categoryList[0] || "Electronics > Mobile Accessories";

  const isSale = salePrice > 0 && salePrice < price;

  return {
    id: itemId, // Meta Content ID (<g:id>): strictly product SKU
    title,
    description,
    availability,
    condition: "new",
    price: formatPrice(price, currency),
    sale_price: isSale ? formatPrice(salePrice, currency) : "",
    link,
    image_link: imageLink,
    additional_image_link: additionalImageLink,
    brand: product.brandName || "BulkMobileMart",
    google_product_category: googleCategory,
    product_type: productType,
    inventory: stock,
    item_group_id: variant ? sku : "",
    custom_label_0: product.hotSelling ? "Hot Selling" : product.justArrived ? "Just Arrived" : "",
    custom_label_1: product.discountedPercent ? `${product.discountedPercent}% OFF` : "",
    raw_product_id: productId,
    sku: sku,
    updated_at: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
  };
};

/**
 * Controller: Get Meta Ads Products Feed
 * Supports query params: format=xml|csv|json, category, brand, inStockOnly, includeVariants
 */
export const getMetaAdsProducts = async (req, res) => {
  try {
    if (!checkSecretAuth(req)) {
      return res.status(401).json({ success: false, message: "Unauthorized feed access: Invalid secret token." });
    }

    const {
      format: queryFormat,
      category,
      brand,
      inStockOnly,
      includeVariants: reqIncludeVariants,
      limit,
      page,
    } = req.query;

    const format = (queryFormat || req.path.split(".").pop() || "json").toLowerCase();

    const baseUrl = process.env.PUBLIC_WEB_URL || "https://www.bulkmobilemart.in";
    const currency = process.env.CURRENCY || "INR";

    const filter = { isActive: true };

    if (category) {
      filter.$or = [
        { categories: { $regex: new RegExp(category, "i") } },
        { subcategory: { $regex: new RegExp(category, "i") } },
      ];
    }

    if (brand) {
      filter.brandName = { $regex: new RegExp(brand, "i") };
    }

    if (inStockOnly === "true" || inStockOnly === true) {
      filter.inStock = true;
      filter.stock = { $gt: 0 };
    }

    const maxLimit = Math.min(parseInt(limit, 10) || 5000, 10000);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * maxLimit;

    const products = await Product.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(maxLimit)
      .lean();

    const includeVariants = reqIncludeVariants === "true" || reqIncludeVariants === true;

    const items = [];
    products.forEach((product) => {
      if (includeVariants && product.variantType === "multi" && Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          items.push(buildMetaProductItem(product, variant, baseUrl, currency));
        });
      } else {
        items.push(buildMetaProductItem(product, null, baseUrl, currency));
      }
    });

    // 1. XML RSS 2.0 Feed Format (Standard Google Shopping / Meta Catalog specification)
    if (format === "xml" || format === "rss") {
      const xmlItems = items
        .map(
          (item) => `
    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.image_link)}</g:image_link>
      ${item.additional_image_link ? `<g:additional_image_link>${escapeXml(item.additional_image_link)}</g:additional_image_link>` : ""}
      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:condition>${escapeXml(item.condition)}</g:condition>
      <g:price>${escapeXml(item.price)}</g:price>
      ${item.sale_price ? `<g:sale_price>${escapeXml(item.sale_price)}</g:sale_price>` : ""}
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:google_product_category>${escapeXml(item.google_product_category)}</g:google_product_category>
      <g:product_type>${escapeXml(item.product_type)}</g:product_type>
      <g:quantity_to_sell_on_facebook>${item.inventory}</g:quantity_to_sell_on_facebook>
      ${item.item_group_id ? `<g:item_group_id>${escapeXml(item.item_group_id)}</g:item_group_id>` : ""}
      ${item.custom_label_0 ? `<g:custom_label_0>${escapeXml(item.custom_label_0)}</g:custom_label_0>` : ""}
      ${item.custom_label_1 ? `<g:custom_label_1>${escapeXml(item.custom_label_1)}</g:custom_label_1>` : ""}
    </item>`
        )
        .join("");

      const xmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>BulkMobileMart Meta Catalog Feed</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Meta Ads &amp; Commerce Catalog Product Feed for BulkMobileMart</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${xmlItems}
  </channel>
</rss>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.status(200).send(xmlFeed);
    }

    // 2. CSV Format (Meta Product Catalog Feed spec)
    if (format === "csv") {
      const headers = [
        "id",
        "title",
        "description",
        "availability",
        "condition",
        "price",
        "sale_price",
        "link",
        "image_link",
        "additional_image_link",
        "brand",
        "google_product_category",
        "product_type",
        "quantity_to_sell_on_facebook",
        "item_group_id",
        "custom_label_0",
        "custom_label_1",
      ];

      const csvRows = [headers.join(",")];

      items.forEach((item) => {
        const row = [
          escapeCsv(item.id),
          escapeCsv(item.title),
          escapeCsv(item.description),
          escapeCsv(item.availability),
          escapeCsv(item.condition),
          escapeCsv(item.price),
          escapeCsv(item.sale_price),
          escapeCsv(item.link),
          escapeCsv(item.image_link),
          escapeCsv(item.additional_image_link),
          escapeCsv(item.brand),
          escapeCsv(item.google_product_category),
          escapeCsv(item.product_type),
          escapeCsv(item.inventory),
          escapeCsv(item.item_group_id),
          escapeCsv(item.custom_label_0),
          escapeCsv(item.custom_label_1),
        ];
        csvRows.push(row.join(","));
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="meta_catalog.csv"');
      return res.status(200).send(csvRows.join("\n"));
    }

    // 3. JSON Response (Default)
    return res.status(200).json({
      success: true,
      store: "BulkMobileMart",
      total_items: items.length,
      currency,
      generated_at: new Date().toISOString(),
      data: items,
    });
  } catch (error) {
    console.error("Meta Ads Products Feed Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Meta Ads product feed",
      error: error.message,
    });
  }
};

/**
 * Controller: Get Meta Ads Summary & Feed Configuration Details
 */
export const getMetaAdsSummary = async (req, res) => {
  try {
    if (!checkSecretAuth(req)) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    const publicApiUrl = process.env.PUBLIC_API_URL || "https://api.bulkmobilemart.in";
    const secretParam = process.env.META_ADS_FEED_SECRET ? `?secret=${process.env.META_ADS_FEED_SECRET}` : "";

    const totalActive = await Product.countDocuments({ isActive: true });
    const totalInStock = await Product.countDocuments({ isActive: true, inStock: true, stock: { $gt: 0 } });

    return res.status(200).json({
      success: true,
      meta_ads_feed: {
        status: "active",
        total_active_products: totalActive,
        total_instock_products: totalInStock,
        feed_urls: {
          xml_feed: `${publicApiUrl}/api/meta-ads/catalog.xml${secretParam}`,
          csv_feed: `${publicApiUrl}/api/meta-ads/catalog.csv${secretParam}`,
          json_feed: `${publicApiUrl}/api/meta-ads/catalog.json${secretParam}`,
          products_endpoint: `${publicApiUrl}/api/meta-ads/products${secretParam}`,
        },
        supported_formats: ["xml", "csv", "json"],
        query_parameters: {
          format: "xml | csv | json (default: json)",
          inStockOnly: "true | false",
          category: "string filter",
          brand: "string filter",
          includeVariants: "true | false",
          limit: "number",
          page: "number",
        },
      },
    });
  } catch (error) {
    console.error("Meta Ads Summary Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
