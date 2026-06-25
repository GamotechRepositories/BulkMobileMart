# Image Usage Audit

Audit of every network image load in `lib/`. Local assets (`Image.asset`, `SvgPicture.asset`) are noted separately — not routed through CDN variants.

**Legend — Priority:** P0 startup path · P1 home scroll · P2 secondary screens · P3 rare

| File | Line | Widget | Display Size | Current URL Source | Old cacheWidth×H | Variant | Recommended Decode | Priority |
|------|------|--------|--------------|-------------------|------------------|---------|-------------------|----------|
| `hero_banner_carousel.dart` | 181 | AppNetworkImage | full × 228 | `banner.imageUrl` (API) | 400×228 | `banner` | 800×450 | P0 |
| `category_nav_section.dart` | via grid | CategoryGridTile | 56×56 | `category.categoryImage` | 96–120 | `thumbnail` | 96×96 | P0 |
| `category_grid_tile.dart` | 180 | AppNetworkImage | 56×56 storefront | `resolveCategoryImageUrl` | 112 | `thumbnail` | 96×96 | P0 |
| `category_grid_tile.dart` | 256 | AppNetworkImage | 48×48 flat | `resolveCategoryImageUrl` | 96 | `thumbnail` | 96×96 | P0 |
| `category_grid_tile.dart` | 345 | AppNetworkImage | 64×64 card | `resolveCategoryImageUrl` | 120 | `thumbnail` | 96×96 | P1 |
| `category_grid_tile.dart` | 489 | AppNetworkImage | 60×60 compact | `imageUrl` | 96 | `thumbnail` | 96×96 | P1 |
| `category_horizontal_strip.dart` | 109 | AppNetworkImage | 48×48 | `resolveCategoryImageUrl` | 96 | `thumbnail` | 96×96 | P1 |
| `category_header_section.dart` | 47 | AppNetworkImage | 48×48 | `resolveCategoryImageUrl` | 96 | `thumbnail` | 96×96 | P2 |
| `top_brands_section.dart` | 103 | AppNetworkImage | ~112×72 | `brand.brandImage` | 112×72 | `small` | 128×128 | P1 |
| `deal_product_card.dart` | 199 | AppNetworkImage | 152×152 | `product.primaryImage` | 152 | `thumbnail` | 256×256 | P0 |
| `mobile_product_card.dart` | 46 | AppNetworkImage | 84×104 | `product.primaryImage` | 168×208 | `thumbnail` | 256×256 | P1 |
| `home_product_row.dart` | via DealProductCard | — | 152×152 | product list | — | `thumbnail` | 256×256 | P1 |
| `product_3d_image.dart` | 58 | AppNetworkImage | 48–56 | `imageUrl` | size×2 | `thumbnail` | 256×256 | P1 |
| `blinkit_order_card.dart` | 287 | Product3DImage | 56×56 | `item.image` | — | `thumbnail` | 256×256 | P2 |
| `blinkit_order_detail_body.dart` | 424 | Product3DImage | 56×56 | `item.image` | — | `thumbnail` | 256×256 | P2 |
| `product_detail_screen.dart` | 1119 | AppNetworkImage | full × 280 | `activeItem.url` | 560 | `large` | 1024×1024 | P2 |
| `product_detail_screen.dart` | 1168 | AppNetworkImage | 64×64 | gallery thumb | 128 | `thumbnail` | 256×256 | P2 |
| `cart_screen.dart` | 261 | AppNetworkImage | 72×72 | `item.productImages[0]` | 144 | `thumbnail` | 256×256 | P2 |
| `checkout_screen.dart` | 934 | AppNetworkImage | 56×56 | cart line image | 112 | `thumbnail` | 256×256 | P2 |
| `buy_again_card.dart` | 130 | AppNetworkImage | ~140 wide | `item.image` | 140 | `thumbnail` | 256×256 | P2 |
| `fly_product_animator.dart` | 169 | AppNetworkImage | 40×40 | fly animation | 80 | `thumbnail` | 256×256 | P3 |
| `added_to_cart_toast.dart` | 36 | AppNetworkImage | 48×48 | toast image | 96 | `thumbnail` | 256×256 | P3 |
| `wishlist_toast.dart` | 36 | AppNetworkImage | 48×48 | toast image | 96 | `thumbnail` | 256×256 | P3 |
| `home_wholesale_banner.dart` | 34 | AppNetworkImage | full × 168 | `AppConstants.promoBannerImage` | 720×336 | `banner` | 800×450 | P1 |
| `home_promo_banner.dart` | 49 | AppNetworkImage | 170×150 | `AppConstants.promoBannerImage` | none | `medium` | 512×512 | P3 |
| `product_share_card_widget.dart` | 55 | AppNetworkImage | 368×300 | share `imageUrl` | 900×700 | `large` | 1024×1024 | P3 |
| `product_share_card.dart` | 127 | `_loadNetworkImage` | canvas | share generation | full | `large` | 1024×1024 | P3 |
| `product_share_capture.dart` | 23 | `NetworkImage` precache | — | share precache | full | `large` | 1024×1024 | P3 |
| `app_logo.dart` | 14 | Image.asset + fallback | 40h | `AppConstants.logoUrl` | height×4 | `small` | 128×128 | P0 |
| `support_screen.dart` | 339 | AppNetworkImage | full × 120 | user attachment URL | 480×240 | `medium` | 512×512 | P3 |
| `payment_modal.dart` | 748 | AppNetworkImage | 130×130 | UPI QR URL | 260 | `small` | 128×128 | P3 |
| `payment_modal.dart` | 877 | AppNetworkImage | full × 140 | payment screenshot | 560×280 | `medium` | 512×512 | P3 |
| `payment_modal.dart` | 699 | SvgPicture.asset | 32×32 | local payment SVG | — | asset | 64×64 | — |
| `social_media_carousel_section.dart` | 214 | SvgPicture.asset | 40×40 | local SVG | — | asset | 64×64 | — |

## Summary

| Pattern | Count | Status |
|---------|-------|--------|
| AppNetworkImage | 28 | Migrated to variant pipeline |
| CachedNetworkImage (direct) | 1 | Logo fallback only (uses resolver) |
| NetworkImage precache | 2 | Share utilities use resolver |
| Local SVG/asset | 4+ | Unchanged |
