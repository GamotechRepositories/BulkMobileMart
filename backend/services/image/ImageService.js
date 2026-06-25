import crypto from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ADMIN_UPLOAD_FOLDERS } from "../../utils/uploadFolders.js";
import { buildCdnUrl, getS3Client } from "../../utils/s3Upload.js";
import { getVariantProfile } from "./imageProfiles.js";
import { ImageProcessor } from "./ImageProcessor.js";
import { S3Uploader } from "./S3Uploader.js";

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function extensionFromMime(mimeType, originalName = "") {
  const fromMime = MIME_TO_EXT[String(mimeType || "").toLowerCase()];
  if (fromMime) return fromMime;
  const match = String(originalName).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "jpg";
}

function buildBaseName() {
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export class ImageService {
  static shouldOptimize(folder) {
    return ADMIN_UPLOAD_FOLDERS.has(folder);
  }

  /**
   * Process an in-memory upload: optimize original + generate WebP variants.
   */
  static async processUpload({ buffer, mimeType, folder, originalName = "" }) {
    if (!buffer?.length) {
      throw new Error("Empty image buffer");
    }

    const uploader = new S3Uploader();
    const mime = String(mimeType || "").toLowerCase();
    const ext = extensionFromMime(mime, originalName);
    const baseName = buildBaseName();

    if (!ImageService.shouldOptimize(folder)) {
      return uploader.uploadSingle({
        folder,
        fileName: `${baseName}.${ext}`,
        buffer,
        contentType: mime || "application/octet-stream",
      });
    }

    if (ImageProcessor.isAnimatedImage(mime)) {
      return uploader.uploadSingle({
        folder,
        fileName: `${baseName}.${ext}`,
        buffer,
        contentType: mime,
      });
    }

    if (!ImageProcessor.canGenerateVariants(mime)) {
      throw new Error("Unsupported image type. Allowed: JPEG, PNG, WEBP");
    }

    const profile = getVariantProfile(folder);
    if (!profile) {
      const optimized = await ImageProcessor.optimizeOriginal(buffer, mime);
      return uploader.uploadSingle({
        folder,
        fileName: `${baseName}.${ext}`,
        buffer: optimized,
        contentType: mime,
      });
    }

    const [optimizedOriginal, variantBuffers] = await Promise.all([
      ImageProcessor.optimizeOriginal(buffer, mime),
      ImageProcessor.generateVariants(buffer, profile),
    ]);

    return uploader.uploadVariantSet({
      folder,
      baseName,
      originalExt: ext,
      originalBuffer: optimizedOriginal,
      originalMime: mime,
      variantBuffers,
    });
  }

  /**
   * After a presigned direct-to-S3 upload, generate variants from the stored original.
   */
  static async processExistingS3Object({ key, folder, mimeType }) {
    if (!key?.trim()) {
      throw new Error("S3 object key is required");
    }

    const client = getS3Client();
    const bucket = process.env.AWS_BUCKET_NAME;
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    const buffer = await streamToBuffer(response.Body);
    const contentType = mimeType || response.ContentType || "image/jpeg";

    const profile = getVariantProfile(folder);
    const uploader = new S3Uploader();
    const mime = String(contentType).toLowerCase();

    if (!profile || !ImageProcessor.canGenerateVariants(mime)) {
      return {
        key,
        folder,
        url: buildCdnUrl(key),
        original: buildCdnUrl(key),
        thumb: null,
        medium: null,
        large: null,
      };
    }

    const variantBuffers = await ImageProcessor.generateVariants(buffer, profile);

    const uploads = Object.entries(variantBuffers).map(async ([variantName, variantBuffer]) => {
      const variantKey = key.replace(/\.[^.]+$/, `_${variantName}.webp`);
      const result = await uploader.uploadWithRetry({
        key: variantKey,
        body: variantBuffer,
        contentType: "image/webp",
      });
      return [variantName, result.url];
    });

    const variantEntries = await Promise.all(uploads);
    const variants = Object.fromEntries(variantEntries);

    return {
      key,
      folder,
      url: buildCdnUrl(key),
      original: buildCdnUrl(key),
      thumb: variants.thumb || null,
      medium: variants.medium || null,
      large: variants.large || null,
    };
  }
}
