import html2canvas from "html2canvas";
import { formatProductPriceLabel } from "./productPricing";
import { clampImageAspectRatio, getDisplayHeightForWidth } from "./productImage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

function getImageExtension(url) {
  const match = url?.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  return match ? match[1].toLowerCase() : "jpg";
}

function getMimeType(ext) {
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return types[ext] || "image/jpeg";
}

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

async function fetchImageBlob(imageUrl) {
  if (!imageUrl) return null;

  try {
    const proxyResponse = await fetch(
      `${API_URL}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
    );
    if (proxyResponse.ok) {
      return await proxyResponse.blob();
    }
  } catch {
    // fall through
  }

  try {
    const directResponse = await fetch(imageUrl);
    if (!directResponse.ok) return null;
    return await directResponse.blob();
  } catch {
    return null;
  }
}

export function buildProductShareContent({ product, shareUrl, variantName = "" }) {
  const priceLabel = formatProductPriceLabel(product, formatPrice, variantName);
  const brandName = product?.brandName?.trim() || "";
  const productName = product?.name?.trim() || "Product";

  const lines = [
    productName,
    priceLabel,
    brandName ? `Brand: ${brandName}` : null,
    variantName ? `Variant: ${variantName}` : null,
    "",
    "Shop on Bulk Mobile Mart:",
    shareUrl,
  ].filter((line) => line !== null && line !== "");

  return {
    title: productName,
    text: lines.join("\n"),
    priceLabel,
    brandName,
    productName,
    shareUrl,
  };
}

function waitForImage(img) {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load share image"));
  });
}

export async function createShareCardImage({ productName, priceLabel, brandName, imageUrl }) {
  if (!imageUrl) return null;

  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;width:400px;background:#ffffff;padding:16px;box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;";

  const card = document.createElement("div");
  card.style.cssText =
    "border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;background:#ffffff;";

  const img = document.createElement("img");
  img.crossOrigin = "anonymous";
  img.src = `${API_URL}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
  img.alt = productName;
  img.style.cssText =
    "display:block;width:100%;object-fit:contain;background:#f8f8f8;padding:12px;box-sizing:border-box;";

  const body = document.createElement("div");
  body.style.padding = "14px 16px 16px";

  const brand = document.createElement("p");
  brand.textContent = brandName || "Bulk Mobile Mart";
  brand.style.cssText =
    "margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#666666;";

  const title = document.createElement("h2");
  title.textContent = productName;
  title.style.cssText =
    "margin:0 0 10px;font-size:17px;font-weight:700;line-height:1.35;color:#000000;";

  const price = document.createElement("p");
  price.textContent = priceLabel;
  price.style.cssText = "margin:0 0 8px;font-size:24px;font-weight:800;color:#ff7a00;";

  const store = document.createElement("p");
  store.textContent = "bulkmobilemart.com";
  store.style.cssText = "margin:0;font-size:12px;font-weight:600;color:#999999;";

  body.append(brand, title, price, store);
  card.append(img, body);
  container.append(card);
  document.body.appendChild(container);

  try {
    await waitForImage(img);
    const aspectRatio = clampImageAspectRatio(img.naturalWidth, img.naturalHeight);
    const imageHeight = getDisplayHeightForWidth(368, aspectRatio, 320);
    img.style.height = `${imageHeight}px`;

    const canvas = await html2canvas(container, {
      useCORS: true,
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Share card render failed"))),
        "image/png",
        0.92
      );
    });

    const safeName = (productName || "product")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();

    return new File([blob], `${safeName || "product"}-share.png`, { type: "image/png" });
  } finally {
    document.body.removeChild(container);
  }
}

export async function getShareableProductFile({ product, imageUrl, variantName = "" }) {
  const { productName, priceLabel, brandName } = buildProductShareContent({
    product,
    shareUrl: "",
    variantName,
  });

  try {
    const shareCard = await createShareCardImage({
      productName,
      priceLabel,
      brandName,
      imageUrl,
    });
    if (shareCard) return shareCard;
  } catch {
    // fall through to plain product image
  }

  const blob = await fetchImageBlob(imageUrl);
  if (!blob) return null;

  const ext = getImageExtension(imageUrl);
  const safeName = productName
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return new File([blob], `${safeName || "product"}.${ext}`, {
    type: blob.type?.startsWith("image/") ? blob.type : getMimeType(ext),
  });
}

export async function shareProduct({ product, shareUrl, imageUrl, variantName = "" }) {
  if (!navigator.share) return false;

  const shareContent = buildProductShareContent({ product, shareUrl, variantName });
  const imageFile = await getShareableProductFile({ product, imageUrl, variantName });

  if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
    await navigator.share({
      title: shareContent.title,
      text: shareContent.text,
      files: [imageFile],
    });
    return true;
  }

  await navigator.share({
    title: shareContent.title,
    text: shareContent.text,
    url: shareUrl,
  });
  return true;
}

function upsertMetaTag(attribute, key, content) {
  if (!content || typeof document === "undefined") return;

  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function updateProductShareMeta({ product, shareUrl, imageUrl, variantName = "" }) {
  if (!product || typeof document === "undefined") return;

  const { title, text, priceLabel, productName } = buildProductShareContent({
    product,
    shareUrl,
    variantName,
  });

  document.title = `${productName} | BulkMobileMart`;

  const description = `${priceLabel}${product.brandName ? ` · ${product.brandName}` : ""} · Wholesale on Bulk Mobile Mart`;

  upsertMetaTag("property", "og:title", productName);
  upsertMetaTag("property", "og:description", description);
  upsertMetaTag("property", "og:image", imageUrl || "");
  upsertMetaTag("property", "og:url", shareUrl);
  upsertMetaTag("property", "og:type", "product");
  upsertMetaTag("name", "description", description);
  upsertMetaTag("name", "twitter:card", "summary_large_image");
  upsertMetaTag("name", "twitter:title", title);
  upsertMetaTag("name", "twitter:description", text);
  upsertMetaTag("name", "twitter:image", imageUrl || "");
}
