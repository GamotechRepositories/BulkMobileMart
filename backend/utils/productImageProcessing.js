import sharp from "sharp";
import { UPLOAD_FOLDERS } from "./uploadFolders.js";

export const PRODUCT_IMAGE_SIZE = 1000;
export const PRODUCT_IMAGE_MIN_SIZE = 1000;

const ALLOWED_PRODUCT_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function isProductUploadFolder(folder) {
  return folder === UPLOAD_FOLDERS.PRODUCTS;
}

export function isAllowedProductImageMime(mimeType) {
  return ALLOWED_PRODUCT_MIMES.has(String(mimeType || "").toLowerCase());
}

export async function processProductImageBuffer(buffer) {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Invalid product image");
  }

  return sharp(buffer)
    .resize(PRODUCT_IMAGE_SIZE, PRODUCT_IMAGE_SIZE, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
