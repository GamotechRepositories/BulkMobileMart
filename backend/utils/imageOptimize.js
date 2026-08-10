import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";

const CACHE_DIR = path.join(os.tmpdir(), "bulkmobilemart-img-cache");
const MAX_CACHE_FILES = 400;

const FOLDER_MAX_WIDTH = {
  "hero-banners": 1600,
  "offer-banners": 1600,
  categories: 512,
  brands: 512,
  products: 1200,
  support: 1200,
  "payment-proofs": 1400,
};

export function getUploadMaxWidth(folder) {
  return FOLDER_MAX_WIDTH[folder] || 1200;
}

/**
 * Compress/resize image uploads to WebP before S3.
 * Does NOT reject by width/height — any dimensions are accepted;
 * oversized files are auto-shrunk for fast delivery.
 * GIFs and non-images are returned unchanged.
 */
export async function optimizeUploadImageBuffer(buffer, mimeType, folder = "") {
  const mime = String(mimeType || "").toLowerCase();
  if (!mime.startsWith("image/") || mime === "image/gif") {
    return { buffer, mimeType: mime || "application/octet-stream" };
  }

  const maxWidth = getUploadMaxWidth(folder);

  try {
    const optimized = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: maxWidth,
        height: maxWidth,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();

    return { buffer: optimized, mimeType: "image/webp" };
  } catch (error) {
    console.warn("Image optimize skipped:", error.message);
    return { buffer, mimeType: mime };
  }
}

function cacheKey(url, width, quality) {
  return crypto
    .createHash("sha1")
    .update(`${url}|${width}|${quality}`)
    .digest("hex");
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readCache(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function writeCache(filePath, buffer) {
  try {
    await ensureCacheDir();
    await fs.writeFile(filePath, buffer);
    // Best-effort prune — ignore failures.
    const entries = await fs.readdir(CACHE_DIR);
    if (entries.length > MAX_CACHE_FILES) {
      const ranked = await Promise.all(
        entries.map(async (name) => {
          const full = path.join(CACHE_DIR, name);
          const stat = await fs.stat(full);
          return { full, mtime: stat.mtimeMs };
        })
      );
      ranked.sort((a, b) => a.mtime - b.mtime);
      const removeCount = ranked.length - MAX_CACHE_FILES;
      await Promise.all(
        ranked.slice(0, removeCount).map((entry) => fs.unlink(entry.full).catch(() => {}))
      );
    }
  } catch {
    // ignore cache write errors
  }
}

/**
 * Fetch a remote image, resize to width, return WebP bytes.
 */
export async function resizeRemoteImage(imageUrl, width = 400, quality = 75) {
  const targetWidth = Math.max(64, Math.min(1600, Number(width) || 400));
  const targetQuality = Math.max(40, Math.min(90, Number(quality) || 75));
  const filePath = path.join(
    CACHE_DIR,
    `${cacheKey(imageUrl, targetWidth, targetQuality)}.webp`
  );

  const cached = await readCache(filePath);
  if (cached?.length) {
    return { buffer: cached, contentType: "image/webp", fromCache: true };
  }

  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Upstream image HTTP ${response.status}`);
  }

  const source = Buffer.from(await response.arrayBuffer());
  const buffer = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({
      width: targetWidth,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: targetQuality, effort: 4 })
    .toBuffer();

  await writeCache(filePath, buffer);
  return { buffer, contentType: "image/webp", fromCache: false };
}
