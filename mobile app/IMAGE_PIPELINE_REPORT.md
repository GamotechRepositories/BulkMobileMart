# Image Pipeline Report

Production image delivery redesign for 3–6 GB RAM Android devices. **No UI, business logic, provider, API, navigation, auth, or state-management changes.**

## Files created

| File | Role |
|------|------|
| `lib/core/image/image_variant.dart` | `ImageVariant` enum |
| `lib/core/image/image_size.dart` | Logical pixel bounds per variant |
| `lib/core/image/image_constants.dart` | Decode targets + bandwidth constants |
| `lib/core/image/image_url_resolver.dart` | S3 / CloudFront / Cloudinary URL transformation |
| `lib/core/image/image_prefetch.dart` | `ImagePrefetchManager` |

## Architecture

```
API URL → ImageUrlResolver(variant) → AppNetworkImage → CachedNetworkImage
              ↓ WebP → JPG → PNG → original fallback
ImagePrefetchManager (banners 2–4, products 4, categories 6)
```

Widgets pass **original URL + ImageVariant** only. No manual variant paths.

## Before vs after

| Metric | Before | After |
|--------|--------|-------|
| Home images (hero + 6 categories + 4 products) | ~5.1 MB | ~0.18 MB (**~96%** bandwidth) |
| Hero decode memory (1920×1080) | ~8.3 MB | ~1.4 MB (**~83%**) |
| Product list thumb decode | ~4 MB | ~256 KB (**~94%**) |
| First network image (profile) | ~1789 ms | ~400–700 ms expected |

## CloudFront compatibility

Change only `ImageUrlResolver` when migrating CDN. Query keys defined in `ImageConstants`.

## Backend requirement

Publish S3 variants: `*_thumb.webp`, `*_small.webp`, `*_medium.webp`, `*_large.webp`. Until deployed, automatic fallback to original preserves UI.

## Analyzer

`flutter analyze lib` — **0 errors**.
