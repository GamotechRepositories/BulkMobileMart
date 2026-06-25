import { PutObjectCommand } from "@aws-sdk/client-s3";
import { buildCdnUrl, getS3Client } from "../../utils/s3Upload.js";
import { buildS3ObjectKey } from "../../utils/uploadFolders.js";

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableS3Error(error) {
  const code = error?.name || error?.Code || "";
  const status = error?.$metadata?.httpStatusCode;
  if (status === 429 || status === 500 || status === 502 || status === 503) return true;
  return ["TimeoutError", "RequestTimeout", "SlowDown", "ServiceUnavailable"].includes(code);
}

export class S3Uploader {
  constructor() {
    this.bucket = process.env.AWS_BUCKET_NAME;
    if (!this.bucket) {
      throw new Error("AWS_BUCKET_NAME is not configured");
    }
  }

  async uploadWithRetry({ key, body, contentType, cacheControl }) {
    const client = getS3Client();
    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: cacheControl || "public, max-age=31536000, immutable",
          })
        );
        return { key, url: buildCdnUrl(key) };
      } catch (error) {
        lastError = error;
        if (!isRetryableS3Error(error) || attempt === MAX_RETRIES - 1) {
          throw error;
        }
        await sleep(BASE_RETRY_MS * (attempt + 1));
      }
    }

    throw lastError;
  }

  /**
   * Upload original + WebP variants sharing the same base name.
   */
  async uploadVariantSet({
    folder,
    baseName,
    originalExt,
    originalBuffer,
    originalMime,
    variantBuffers,
  }) {
    const originalFileName = `${baseName}.${originalExt}`;
    const originalKey = buildS3ObjectKey(folder, originalFileName);

    const originalResult = await this.uploadWithRetry({
      key: originalKey,
      body: originalBuffer,
      contentType: originalMime,
    });

    const variantEntries = await Promise.all(
      Object.entries(variantBuffers).map(async ([variantName, buffer]) => {
        const fileName = `${baseName}_${variantName}.webp`;
        const key = buildS3ObjectKey(folder, fileName);
        const result = await this.uploadWithRetry({
          key,
          body: buffer,
          contentType: "image/webp",
        });
        return [variantName, result.url];
      })
    );

    const variantUrls = Object.fromEntries(variantEntries);

    return {
      key: originalResult.key,
      folder,
      url: originalResult.url,
      original: originalResult.url,
      thumb: variantUrls.thumb || null,
      medium: variantUrls.medium || null,
      large: variantUrls.large || null,
    };
  }

  async uploadSingle({ folder, fileName, buffer, contentType }) {
    const key = buildS3ObjectKey(folder, fileName);
    const result = await this.uploadWithRetry({ key, body: buffer, contentType });
    return {
      ...result,
      folder,
      original: result.url,
      thumb: null,
      medium: null,
      large: null,
    };
  }
}
