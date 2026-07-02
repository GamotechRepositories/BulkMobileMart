import { buildApiUrl } from "../api/api";

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

async function fetchImageBlob(imageUrl) {
  if (!imageUrl) return null;

  try {
    const proxyResponse = await fetch(
      buildApiUrl(`/api/proxy/image?url=${encodeURIComponent(imageUrl)}`)
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

export function buildProductShareContent({
  product,
  shareUrl,
  variantName = "",
  includeUrl = true,
}) {
  const brandName = product?.brandName?.trim() || "";
  const productName = product?.name?.trim() || "Product";

  const lines = [
    productName,
    brandName ? `Brand: ${brandName}` : null,
    variantName ? `Variant: ${variantName}` : null,
    includeUrl ? "" : null,
    includeUrl ? "Shop on Bulk Mobile Mart:" : null,
    includeUrl ? shareUrl : null,
  ].filter((line) => line !== null && line !== "");

  return {
    title: productName,
    text: lines.join("\n"),
    brandName,
    productName,
    shareUrl,
  };
}

export async function getShareableProductFile({ product, imageUrl, variantName = "" }) {
  const { productName } = buildProductShareContent({
    product,
    shareUrl: "",
    variantName,
    includeUrl: false,
  });

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

  const shareContent = buildProductShareContent({
    product,
    shareUrl,
    variantName,
    includeUrl: true,
  });
  const imageFile = await getShareableProductFile({ product, imageUrl, variantName });

  if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
    const caption = buildProductShareContent({
      product,
      shareUrl: "",
      variantName,
      includeUrl: false,
    }).text;

    const sharePayload = {
      title: shareContent.title,
      text: caption,
      files: [imageFile],
    };

    if (shareUrl && navigator.canShare?.({ ...sharePayload, url: shareUrl })) {
      await navigator.share({ ...sharePayload, url: shareUrl });
    } else {
      await navigator.share(sharePayload);
    }

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

  const { title, productName, brandName } = buildProductShareContent({
    product,
    shareUrl,
    variantName,
    includeUrl: false,
  });

  document.title = `${productName} | BulkMobileMart`;

  const description = brandName
    ? `${brandName} · Wholesale on Bulk Mobile Mart`
    : "Wholesale on Bulk Mobile Mart";

  upsertMetaTag("property", "og:title", productName);
  upsertMetaTag("property", "og:description", description);
  upsertMetaTag("property", "og:image", imageUrl || "");
  upsertMetaTag("property", "og:url", shareUrl);
  upsertMetaTag("property", "og:type", "product");
  upsertMetaTag("name", "description", description);
  upsertMetaTag("name", "twitter:card", "summary_large_image");
  upsertMetaTag("name", "twitter:title", title);
  upsertMetaTag("name", "twitter:description", description);
  upsertMetaTag("name", "twitter:image", imageUrl || "");
}
