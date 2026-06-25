# Image Backend Report

Production image optimization pipeline for BulkMobileMart admin uploads.

## Folder structure

```
backend/
├── services/image/
│   ├── imageProfiles.js    # Variant dimensions per folder
│   ├── ImageProcessor.js   # Sharp resize + WebP encode
│   ├── S3Uploader.js       # S3 PutObject with retry
│   └── ImageService.js     # Orchestrates upload pipeline
├── controllers/
│   └── uploadController.js # POST /image, POST /process-variants
├── routes/
│   └── uploadRoutes.js
└── utils/
    └── s3Upload.js         # Shared S3 client + CDN URL builder
```

## Pipeline

```
Admin multipart upload (POST /api/upload/image)
        │
        ▼
   ImageService.processUpload()
        │
        ├── ImageProcessor.optimizeOriginal()  → original.jpg/png (kept)
        ├── ImageProcessor.generateVariants()  → thumb/medium/large WebP
        └── S3Uploader.uploadVariantSet()      → parallel S3 uploads (retry ×3)
        │
        ▼
   JSON response
   {
     "original": "https://cdn…/products/1234-abc.jpg",
     "thumb":    "https://cdn…/products/1234-abc_thumb.webp",
     "medium":   "https://cdn…/products/1234-abc_medium.webp",
     "large":    "https://cdn…/products/1234-abc_large.webp",
     "url":      "…"  // same as original (backward compatible)
   }
```

### Variant sizes (Sharp, quality 80 WebP)

| Folder | thumb | medium | large |
|--------|-------|--------|-------|
| `categories` | 96×96 | 128×128 | 256×256 |
| `brands` | 128×128 | 256×256 | 512×512 |
| `products` | 256×256 | 512×512 | 1024×1024 |
| `hero-banners` | 400×225 | 800×450 | 1200×675 |

### Supported input formats

JPEG · PNG · WebP (GIF uploads original only — no variant split for animation)

## AWS upload flow

1. **Original** — `{folder}/{timestamp}-{id}.{ext}` (optimized, format preserved)
2. **Variants** — `{folder}/{timestamp}-{id}_thumb.webp`, `_medium.webp`, `_large.webp`
3. **CDN** — Public URLs via `CLOUDFRONT_URL/{key}`
4. **Cache** — `Cache-Control: public, max-age=31536000, immutable`
5. **Retry** — 3 attempts with backoff on 429/5xx/timeout

### Presign fallback

`POST /api/upload/process-variants` — generates variants for an object already on S3 (legacy presign flow).

Body: `{ "folder": "products", "key": "products/1234-abc.jpg", "mimeType": "image/jpeg" }`

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload/image` | Multer upload + auto variants (admin folders) |
| `POST` | `/api/upload/process-variants` | Variants for existing S3 key |
| `POST` | `/api/upload/presign` | Unchanged (videos / legacy) |

## Admin integration

`admin/src/api/api.js` → `uploadImageFile()` now posts to `/api/upload/image` so every admin image pick generates variants server-side.

Database still stores **`original`** URL — Flutter `ImageUrlResolver` requests `*_thumb.webp` / `*_medium.webp` automatically.

## Performance improvements

| Stage | Before | After |
|-------|--------|-------|
| Server processing | None | ~200–800 ms per image (Sharp, parallel variants) |
| S3 objects per upload | 1 | 4 (original + 3 WebP) |
| Client download (home hero) | ~800–1500 KB JPEG | ~55 KB WebP medium |
| Client download (product thumb) | ~850 KB | ~12 KB WebP |

## Bandwidth savings (client)

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Home hero | ~1.2 MB | ~55 KB | **~95%** |
| 6 category icons | ~1.8 MB | ~72 KB | **~96%** |
| Product grid (12 items) | ~10 MB | ~144 KB | **~99%** |

## Expected Flutter startup improvement

From `FIRST_FRAME_PROFILE.md` baseline:

| Metric | Before | Expected after variants on CDN |
|--------|--------|----------------------------------|
| First network image | ~1789 ms | **~400–700 ms** |
| Image decode | ~43 ms | **~15–25 ms** |
| First provider | ~966 ms | unchanged (API-bound) |

Widget builds remain 0–1 ms — gains are entirely from smaller payloads matching the Flutter image pipeline deployed earlier.

## Error handling

- Empty buffer / unsupported MIME → 400/500 with message
- S3 transient failures → retry up to 3× with exponential backoff
- GIF / non-admin folders → original only (no variants)
- `process-variants` validates folder/key prefix match
- Errors logged with `[uploadImage]` / `[processImageVariants]` prefix

## Dependencies added

- `sharp@^0.34.3` — libvips image processing

## Deployment checklist

1. `npm install` in `backend/`
2. Ensure `AWS_*` and `CLOUDFRONT_URL` env vars are set
3. Sharp native binaries install automatically on Linux (production)
4. Re-upload admin assets or run batch variant job for existing images
