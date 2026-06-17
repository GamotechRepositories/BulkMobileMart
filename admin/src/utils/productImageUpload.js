import { UPLOAD_FOLDERS } from "./uploadFolders";

export const PRODUCT_IMAGE_SIZE = 1000;
export const PRODUCT_IMAGE_MIN_SIZE = 1000;

export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export const PRODUCT_IMAGE_HINT =
  "1000×1000 px recommended · JPG, PNG, WEBP · Max 5 MB · Auto-resized to square with white background";

export const PRODUCT_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function isProductImageFolder(folder) {
  return folder === UPLOAD_FOLDERS.PRODUCTS;
}

export function validateProductImageFile(file) {
  if (!file) return "Please choose an image file";

  if (!PRODUCT_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return "Product images must be JPG, PNG, or WEBP";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "Image must be under 5 MB";
  }

  return "";
}

export function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image dimensions"));
    };

    image.src = url;
  });
}
