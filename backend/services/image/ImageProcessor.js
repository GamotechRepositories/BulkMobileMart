import sharp from "sharp";
import { WEBP_QUALITY } from "./imageProfiles.js";

const SUPPORTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ANIMATED_MIME = new Set(["image/gif"]);

export class ImageProcessor {
  static isSupportedImage(mimeType) {
    const mime = String(mimeType || "").toLowerCase();
    return SUPPORTED_MIME.has(mime);
  }

  static isAnimatedImage(mimeType) {
    return ANIMATED_MIME.has(String(mimeType || "").toLowerCase());
  }

  static canGenerateVariants(mimeType) {
    return ImageProcessor.isSupportedImage(mimeType);
  }

  /**
   * Keep original format, strip EXIF orientation, light compression.
   */
  static async optimizeOriginal(buffer, mimeType) {
    const mime = String(mimeType || "").toLowerCase();
    const pipeline = sharp(buffer, { failOn: "none" }).rotate();

    if (mime === "image/png") {
      return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    }
    if (mime === "image/webp") {
      return pipeline.webp({ quality: 85 }).toBuffer();
    }
    return pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  }

  static async generateWebpVariant(buffer, { width, height, fit = "inside" }) {
    return sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(width, height, {
        fit,
        withoutEnlargement: true,
        position: "centre",
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
  }

  /**
   * @param {Buffer} buffer
   * @param {Record<string, { width: number, height: number, fit?: string }>} profile
   * @returns {Promise<Record<string, Buffer>>}
   */
  static async generateVariants(buffer, profile) {
    const entries = Object.entries(profile);
    const results = await Promise.all(
      entries.map(async ([name, spec]) => {
        const data = await ImageProcessor.generateWebpVariant(buffer, spec);
        return [name, data];
      })
    );
    return Object.fromEntries(results);
  }
}
