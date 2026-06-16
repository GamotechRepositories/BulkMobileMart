import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductById } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import WishlistButton from "../components/product/WishlistButton";
import {
  formatProductPriceLabel,
  getAvailableColors,
  getBulkTierRows,
  getMinOrderQuantity,
  getUnitPriceForQuantity,
  getVariantStock,
  isBulkPricing,
  isMultiVariant,
} from "../utils/productPricing";
import {
  buildBuyNowCheckoutItem,
  setBuyNowCheckout,
} from "../utils/checkoutSession";
import {
  buildProductShareContent,
  getShareableProductFile,
  shareProduct,
  updateProductShareMeta,
} from "../utils/productShare";

const DEFAULT_MOQ = 1;
const REVIEW_COUNT = 128;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

function productSku(product) {
  const code = (product.subcategory || product.brandName || "SKU")
    .replace(/\s+/g, "-")
    .toUpperCase();
  return `BMM-${code}`;
}

function getImageExtension(url) {
  const match = url?.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  return match ? match[1].toLowerCase() : "jpg";
}

function getMimeType(ext) {
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return types[ext] || "image/jpeg";
}

function buildImageFilename(productName, imageUrl, imageIndex) {
  const ext = getImageExtension(imageUrl);
  const safeName = (productName || "product")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return `${safeName || "product"}-${imageIndex + 1}.${ext}`;
}

function getResolvedSpecifications(product) {
  if (Array.isArray(product?.specifications) && product.specifications.length > 0) {
    return product.specifications.filter((spec) => spec?.name && spec?.value);
  }

  const fallback = [];
  if (product?.brandName) fallback.push({ name: "Brand", value: product.brandName });
  if (product?.categories?.[0]) fallback.push({ name: "Category", value: product.categories[0] });
  if (product?.subcategory) fallback.push({ name: "Subcategory", value: product.subcategory });
  if (product?.warranty) fallback.push({ name: "Warranty", value: product.warranty });
  if (Array.isArray(product?.features)) {
    product.features.forEach((feature, index) => {
      if (feature?.trim()) {
        fallback.push({ name: `Feature ${index + 1}`, value: feature.trim() });
      }
    });
  }
  return fallback;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function buildProxyDownloadUrl(imageUrl, filename) {
  const params = new URLSearchParams({
    url: imageUrl,
    filename,
  });
  return `${API_URL}/api/proxy/image/download?${params.toString()}`;
}

function triggerBlobDownload(blob, filename, mimeType) {
  const objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function downloadProductImage(imageUrl, productName, imageIndex) {
  if (!imageUrl) return false;

  const filename = buildImageFilename(productName, imageUrl, imageIndex);
  const blob = await fetchImageBlob(imageUrl);

  if (!blob) {
    try {
      const response = await fetch(buildProxyDownloadUrl(imageUrl, filename));
      if (response.ok) {
        const fallbackBlob = await response.blob();
        triggerBlobDownload(
          fallbackBlob,
          filename,
          getMimeType(getImageExtension(imageUrl))
        );
        return true;
      }
    } catch {
      // fall through to direct navigation download
    }

    window.location.assign(buildProxyDownloadUrl(imageUrl, filename));
    return true;
  }

  const ext = getImageExtension(imageUrl);
  const mimeType = blob.type?.startsWith("image/") ? blob.type : getMimeType(ext);
  const file = new File([blob], filename, { type: mimeType });

  if (isMobileDevice() && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (error) {
      if (error?.name === "AbortError") return false;
    }
  }

  if (isMobileDevice()) {
    window.location.assign(buildProxyDownloadUrl(imageUrl, filename));
    return true;
  }

  triggerBlobDownload(blob, filename, mimeType);
  return true;
}

async function fetchImageBlob(imageUrl) {
  if (!imageUrl) return null;

  try {
    const proxyResponse = await fetch(
      `${API_URL}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
    );
    if (proxyResponse.ok) {
      return await proxyResponse.blob();
    }
  } catch {
    // fall through to direct fetch
  }

  try {
    const directResponse = await fetch(imageUrl);
    if (!directResponse.ok) return null;
    return await directResponse.blob();
  } catch {
    return null;
  }
}

function DownloadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function ProductShareMenu({ product, shareUrl, imageUrl, variantName = "" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const menuRef = useRef(null);

  const shareContent = buildProductShareContent({ product, shareUrl, variantName });
  const { text: shareMessage, title: shareTitle } = shareContent;
  const shareText = `${shareContent.productName} · ${shareContent.priceLabel}`;

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const shareOptions = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: "WA",
      iconClass: "bg-green-500 text-white",
      fallbackUrl: `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: "f",
      iconClass: "bg-blue-600 text-white",
      fallbackUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    },
    {
      id: "twitter",
      label: "X",
      icon: "X",
      iconClass: "bg-black text-white",
      fallbackUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      id: "email",
      label: "Email",
      icon: "@",
      iconClass: "bg-mobile-surface text-text-primary",
      fallbackUrl: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareMessage)}`,
    },
  ];

  const handleNativeShare = async () => {
    if (!navigator.share) return false;

    setSharing(true);

    try {
      await shareProduct({ product, shareUrl, imageUrl, variantName });
      setOpen(false);
      return true;
    } catch (error) {
      if (error?.name === "AbortError") return true;
      return false;
    } finally {
      setSharing(false);
    }
  };

  const handlePlatformShare = async (fallbackUrl) => {
    setSharing(true);

    try {
      const shared = await shareProduct({ product, shareUrl, imageUrl, variantName });
      if (shared) {
        setOpen(false);
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    } finally {
      setSharing(false);
    }

    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleCopyShare = async () => {
    const imageFile = await getShareableProductFile({ product, imageUrl, variantName });

    try {
      if (imageFile && navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([shareMessage], { type: "text/plain" }),
            [imageFile.type]: imageFile,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch {
      // fall through to text-only copy
    }

    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShareClick = async () => {
    const shared = await handleNativeShare();
    if (!shared) {
      setOpen((prev) => !prev);
    }
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={handleShareClick}
        disabled={sharing}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-text-secondary transition hover:border-primary hover:text-primary disabled:opacity-50"
        aria-label="Share product"
        aria-expanded={open}
      >
        <ShareIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-border-light bg-white p-3 shadow-lg">
          <p className="mb-1 text-sm font-semibold text-text-primary">Share this product</p>
          <p className="mb-3 text-[11px] leading-snug text-text-secondary">
            Shares product image, price, and link
          </p>

          <div className="grid grid-cols-4 gap-2">
            {shareOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={sharing}
                onClick={() => handlePlatformShare(option.fallbackUrl)}
                className="flex flex-col items-center gap-1 rounded-md px-1 py-2 text-center transition hover:bg-mobile-surface disabled:opacity-50"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${option.iconClass}`}
                >
                  {option.icon}
                </span>
                <span className="text-[10px] font-medium text-text-secondary">{option.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopyShare}
            disabled={sharing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border-light px-3 py-2 text-sm font-semibold text-text-primary transition hover:bg-mobile-surface disabled:opacity-50"
          >
            {copied ? "Copied!" : "Copy details & image"}
          </button>
        </div>
      )}
    </div>
  );
}

function StarRating({ rating, reviewCount }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 text-primary" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-4 w-4 ${star <= Math.floor(rating) ? "fill-current" : "fill-none"}`}
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth={1.2}
          >
            <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.9l-4.94 2.81.94-5.5-4-3.9 5.53-.8L10 1.5z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-text-secondary">
        {rating.toFixed(1)} ({reviewCount})
      </span>
    </div>
  );
}

function ProductImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-mobile-surface text-text-muted">
        <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-contain p-2 sm:p-4"
    />
  );
}

const TABS = [
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
  { id: "reviews", label: "Reviews" },
  { id: "shipping", label: "Shipping & Delivery", shortLabel: "Shipping" },
];

function ThumbnailCarousel({ images, activeImage, onSelect }) {
  if (images.length <= 1) return null;

  return (
    <div className="flex justify-center gap-2 overflow-x-auto hide-scrollbar">
      {images.map((img, index) => (
        <button
          key={`${img}-${index}`}
          type="button"
          onClick={() => onSelect(index)}
          className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white lg:h-[72px] lg:w-[72px] ${
            activeImage === index ? "border-primary" : "border-border-light"
          }`}
        >
          <img src={img} alt="" className="h-full w-full object-contain p-1" />
        </button>
      ))}
    </div>
  );
}

function QuantitySelector({ quantity, min, max, onDecrease, onIncrease, disabled }) {
  return (
    <div className="flex w-full items-center justify-between gap-2 py-1 sm:gap-3">
      <span className="shrink-0 text-xs font-semibold text-text-primary sm:text-sm">
        Quantity (Pieces)
      </span>
      <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-border-light">
        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled || quantity <= min}
          aria-label="Decrease quantity"
          className="flex h-8 w-8 items-center justify-center border-r border-border-light bg-white text-base text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="flex h-8 min-w-[2.25rem] items-center justify-center border-r border-border-light bg-white px-1.5 text-sm font-bold text-text-primary">
          {quantity}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled || quantity >= max}
          aria-label="Increase quantity"
          className="flex h-8 w-8 items-center justify-center bg-white text-base text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ActionButtons({ inStock, onAddToCart, onBuyNow, className = "" }) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={!inStock}
        className="flex-1 rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add to Cart
      </button>
      <button
        type="button"
        onClick={onBuyNow}
        disabled={!inStock}
        className="flex-1 rounded-md border-2 border-primary bg-white px-6 py-3.5 text-sm font-bold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Buy Now
      </button>
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const buyNowPendingRef = useRef(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [quantity, setQuantity] = useState(DEFAULT_MOQ);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [downloadingImage, setDownloadingImage] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getProductById(id);
        const nextProduct = data.data;
        const initialVariant =
          nextProduct?.variantType === "multi"
            ? nextProduct.variants?.[0]?.name || ""
            : "";
        const initialColors = getAvailableColors(nextProduct, initialVariant);

        setProduct(nextProduct);
        setSelectedVariant(initialVariant);
        setSelectedColor(initialColors[0]?.name || "");
        setActiveImage(0);
        setActiveTab("description");
        setQuantity(getMinOrderQuantity(nextProduct, initialVariant, DEFAULT_MOQ));
      } catch {
        setProduct(null);
        setSelectedVariant("");
        setSelectedColor("");
        setError("Product not found.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleVariantChange = (variantName) => {
    setSelectedVariant(variantName);
    if (product) {
      const colors = getAvailableColors(product, variantName);
      setSelectedColor(colors[0]?.name || "");
      setQuantity(getMinOrderQuantity(product, variantName, DEFAULT_MOQ));
    }
  };

  const images = useMemo(() => {
    if (!product?.productImages?.length) return [];
    return product.productImages.filter(
      (img) => typeof img === "string" && img.trim()
    );
  }, [product]);

  const activeVariantName = product && isMultiVariant(product) ? selectedVariant : "";

  const shareUrl =
    typeof window !== "undefined" && product?._id
      ? `${window.location.origin}/product/${product._id}`
      : "";

  const shareImageUrl = images[activeImage] || images[0] || "";
  const specifications = useMemo(() => getResolvedSpecifications(product), [product]);

  useEffect(() => {
    if (!product) return undefined;

    updateProductShareMeta({
      product,
      shareUrl,
      imageUrl: shareImageUrl,
      variantName: activeVariantName,
    });

    return () => {
      document.title = "BulkMobileMart";
    };
  }, [product, shareUrl, shareImageUrl, activeVariantName]);

  const availableColors = useMemo(() => {
    if (!product) return [];
    return getAvailableColors(product, activeVariantName);
  }, [product, activeVariantName]);

  const bulkTiers = useMemo(() => {
    if (!product || !isBulkPricing(product, activeVariantName)) return [];
    return getBulkTierRows(product, activeVariantName);
  }, [product, activeVariantName]);

  const minOrderQuantity = product
    ? getMinOrderQuantity(product, activeVariantName, DEFAULT_MOQ)
    : DEFAULT_MOQ;
  const currentUnitPrice = product
    ? getUnitPriceForQuantity(product, quantity, activeVariantName)
    : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    if (availableColors.length > 0 && !selectedColor) return;
    const result = await addToCart(product, quantity, {
      variantName: activeVariantName,
      colorName: selectedColor,
    });
    if (result?.requiresLogin) {
      openAuthModal("login");
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (availableColors.length > 0 && !selectedColor) return;

    const checkoutItem = buildBuyNowCheckoutItem(
      product,
      quantity,
      activeVariantName,
      selectedColor
    );
    setBuyNowCheckout(checkoutItem);

    if (!user) {
      buyNowPendingRef.current = true;
      openAuthModal("login");
      return;
    }

    navigate("/checkout", { state: { mode: "buyNow" } });
  };

  useEffect(() => {
    if (!user || !buyNowPendingRef.current) return;

    buyNowPendingRef.current = false;
    navigate("/checkout", { state: { mode: "buyNow" } });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-28 lg:pb-10">
        <div className="mx-auto w-full max-w-7xl px-3 pb-8 pt-4 sm:px-4 md:px-5 lg:px-6 xl:px-8">
          <div className="animate-pulse">
            <div className="mb-6 hidden h-4 w-64 rounded bg-mobile-surface lg:block" />
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
              <div className="h-[260px] rounded-lg border border-border-light bg-mobile-surface sm:h-[290px] lg:h-[360px]" />
              <div className="space-y-4">
                <div className="h-7 w-3/4 rounded bg-mobile-surface sm:h-8" />
                <div className="h-4 w-1/4 rounded bg-mobile-surface" />
                <div className="h-10 w-1/3 rounded bg-mobile-surface" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white pb-28 lg:pb-10">
        <div className="mx-auto w-full max-w-7xl px-3 py-16 text-center sm:px-4 md:px-5 lg:px-6 xl:px-8">
          <p className="mb-6 text-text-secondary">{error || "Product not found."}</p>
          <Link to="/product" className="text-sm font-medium text-primary hover:underline">
            ← Back to products
          </Link>
        </div>
      </div>
    );
  }

  const category = product.categories?.[0] || "Products";
  const variantStock = getVariantStock(product, activeVariantName);
  const inStock = variantStock > 0;
  const rating = product.ratings || 4.5;
  const maxQuantity = inStock
    ? Math.max(variantStock, minOrderQuantity)
    : minOrderQuantity;

  return (
    <div className="min-h-screen bg-white pb-24 text-text-primary lg:pb-10">
      <div className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4 md:px-5 lg:px-6 lg:pt-4 xl:px-8">
        <nav className="mb-4 hidden flex-wrap items-center gap-1.5 text-xs text-text-secondary sm:mb-5 sm:text-sm lg:flex">
          <Link to="/" className="transition hover:text-primary">
            Home
          </Link>
          <span className="text-text-muted">›</span>
          <Link
            to={`/product?categoryName=${encodeURIComponent(category)}`}
            className="transition hover:text-primary"
          >
            {category}
          </Link>
          <span className="text-text-muted">›</span>
          <span className="min-w-0 truncate font-medium text-text-primary">{product.name}</span>
        </nav>

        <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8 xl:gap-10">
          <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
            <div className="relative overflow-hidden rounded-lg border border-border-light bg-white">
              <div className="absolute left-2 top-2 z-10">
                <WishlistButton product={product} size="md" />
              </div>
              {images[activeImage] && (
                <button
                  type="button"
                  disabled={downloadingImage}
                  onClick={async () => {
                    setDownloadingImage(true);
                    try {
                      await downloadProductImage(
                        images[activeImage],
                        product.name,
                        activeImage
                      );
                    } finally {
                      setDownloadingImage(false);
                    }
                  }}
                  className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border-light bg-white/95 text-text-secondary shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60"
                  aria-label="Save image to gallery"
                >
                  <DownloadIcon />
                </button>
              )}
              <div className="flex h-[260px] w-full items-center justify-center sm:h-[290px] lg:h-[360px] xl:h-[380px]">
                <ProductImage src={images[activeImage]} alt={product.name} />
              </div>
            </div>
            <div className="mt-auto">
              <ThumbnailCarousel
                images={images}
                activeImage={activeImage}
                onSelect={setActiveImage}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between gap-3">
              <h1 className="min-w-0 flex-1 truncate text-2xl font-bold leading-tight lg:text-[1.75rem] xl:text-3xl">
                {product.name}
              </h1>
              <ProductShareMenu
                product={product}
                shareUrl={shareUrl}
                imageUrl={shareImageUrl}
                variantName={activeVariantName}
              />
            </div>
            <p className="mt-1 text-sm text-text-secondary">{productSku(product)}</p>

            <div className="mt-2">
              <StarRating rating={rating} reviewCount={REVIEW_COUNT} />
            </div>

            <p className="mt-3 text-3xl font-bold text-primary lg:mt-4 lg:text-[2rem] xl:text-4xl">
              {formatProductPriceLabel(product, formatPrice, activeVariantName)}
            </p>

            {isMultiVariant(product) ? (
              <div className="mt-3">
                <p className="mb-2 text-sm font-semibold text-text-primary">Select variant</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isActive = selectedVariant === variant.name;
                    return (
                      <button
                        key={variant.name}
                        type="button"
                        onClick={() => handleVariantChange(variant.name)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          isActive
                            ? "border-primary bg-primary text-white"
                            : "border-border-light bg-white text-text-primary hover:border-primary/40"
                        }`}
                      >
                        {variant.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {availableColors.length > 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-sm font-semibold text-text-primary">Select color</p>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => {
                    const isActive = selectedColor === color.name;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setSelectedColor(color.name)}
                        title={color.name}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          isActive
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border-light bg-white text-text-primary hover:border-primary/40"
                        }`}
                      >
                        {color.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {isBulkPricing(product, activeVariantName) ? (
              <p className="mt-1 text-sm text-text-secondary">
                Current selection: {formatPrice(currentUnitPrice)} / piece
              </p>
            ) : null}

            {(isBulkPricing(product, activeVariantName) || isMultiVariant(product)) ? (
              <p className="mt-2 text-sm font-medium text-text-primary">
                {isBulkPricing(product, activeVariantName)
                  ? `MOQ: ${minOrderQuantity} Pieces`
                  : null}
                {isBulkPricing(product, activeVariantName) && isMultiVariant(product)
                  ? ` · Stock: ${variantStock}`
                  : null}
                {!isBulkPricing(product, activeVariantName) && isMultiVariant(product)
                  ? `Stock: ${variantStock}`
                  : null}
              </p>
            ) : null}

            <div className="mt-2">
              <QuantitySelector
                quantity={quantity}
                min={minOrderQuantity}
                max={maxQuantity}
                disabled={!inStock}
                onDecrease={() =>
                  setQuantity((prev) => Math.max(minOrderQuantity, prev - minOrderQuantity))
                }
                onIncrease={() =>
                  setQuantity((prev) => Math.min(maxQuantity, prev + minOrderQuantity))
                }
              />
            </div>

            {bulkTiers.length > 0 ? (
              <div className="mt-3 lg:mt-4">
                <h2 className="mb-2 text-base font-bold">Bulk Price (Per Piece)</h2>
                <div className="overflow-hidden rounded-lg border border-border-light">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-mobile-surface">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold text-text-primary">Qty (Pieces)</th>
                        <th className="px-4 py-2.5 font-semibold text-text-primary">Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkTiers.map((tier) => (
                        <tr key={tier.key || tier.qty} className="border-t border-border-light">
                          <td className="px-4 py-2.5 text-text-secondary">{tier.qty}</td>
                          <td className="px-4 py-2.5 font-medium text-text-primary">
                            {formatPrice(tier.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <ActionButtons
              inStock={inStock}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              className="mt-5 flex w-full gap-3 lg:mt-auto lg:pt-4"
            />
          </div>
        </div>

        <div className="mt-8 border-t border-border-light pt-5 sm:mt-10 sm:pt-6">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar border-b border-border-light sm:gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-2 pb-2.5 text-xs font-semibold transition sm:pb-3 sm:text-sm ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.id === "reviews"
                  ? `Reviews (${REVIEW_COUNT})`
                  : tab.shortLabel
                    ? (
                        <>
                          <span className="sm:hidden">{tab.shortLabel}</span>
                          <span className="hidden sm:inline">{tab.label}</span>
                        </>
                      )
                    : tab.label}
              </button>
            ))}
          </div>

          <div className="py-5 text-xs leading-relaxed text-text-secondary sm:py-6 sm:text-sm">
            {activeTab === "description" && (
              <div>
                <p className="mb-4 text-text-primary">
                  {product.description ||
                    `${product.name} supports fast charging for all devices. Safe, reliable & high performance with premium build quality.`}
                </p>
                {product.features?.length > 0 && (
                  <ul className="list-disc space-y-2 pl-5 text-text-primary">
                    {product.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "specifications" && (
              <div>
                {specifications.length > 0 ? (
                  <ul className="space-y-2 text-text-primary">
                    {specifications.map((spec, index) => (
                      <li key={`${spec.name}-${spec.value}-${index}`}>
                        <span className="font-semibold">{spec.name}: </span>
                        {spec.value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-secondary">No specifications added.</p>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <p>
                Rated {rating.toFixed(1)} out of 5 based on {REVIEW_COUNT} dealer reviews.
              </p>
            )}

            {activeTab === "shipping" && (
              <div className="space-y-2 text-text-primary">
                <p>Pan-India delivery available for bulk orders.</p>
                <p>GST invoice provided with every order.</p>
                <p>Standard delivery: 3–7 business days across major cities.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
