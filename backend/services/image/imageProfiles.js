/**
 * Variant dimensions per upload folder — matches Flutter ImageUrlResolver suffixes.
 * thumb → *_thumb.webp, medium → *_medium.webp, large → *_large.webp
 */
export const WEBP_QUALITY = 80;

export const IMAGE_VARIANT_PROFILES = {
  categories: {
    thumb: { width: 96, height: 96, fit: "inside" },
    medium: { width: 128, height: 128, fit: "inside" },
    large: { width: 256, height: 256, fit: "inside" },
  },
  brands: {
    thumb: { width: 128, height: 128, fit: "inside" },
    medium: { width: 256, height: 256, fit: "inside" },
    large: { width: 512, height: 512, fit: "inside" },
  },
  products: {
    thumb: { width: 256, height: 256, fit: "inside" },
    medium: { width: 512, height: 512, fit: "inside" },
    large: { width: 1024, height: 1024, fit: "inside" },
  },
  "hero-banners": {
    thumb: { width: 400, height: 225, fit: "cover" },
    medium: { width: 800, height: 450, fit: "cover" },
    large: { width: 1200, height: 675, fit: "cover" },
  },
};

export function getVariantProfile(folder) {
  return IMAGE_VARIANT_PROFILES[folder] || null;
}
