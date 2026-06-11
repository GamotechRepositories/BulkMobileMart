import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductById } from "../api/api";
import { LOGO_URL } from "../components/layout/Header";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const DEFAULT_MOQ = 10;
const REVIEW_COUNT = 128;

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

function buildDownloadUrl(imageUrl, filename) {
  if (imageUrl.includes("cloudinary.com") && imageUrl.includes("/upload/")) {
    return imageUrl.replace("/upload/", `/upload/fl_attachment:${filename}/`);
  }
  return imageUrl;
}

async function downloadProductImage(imageUrl, productName, imageIndex) {
  if (!imageUrl) return;

  const safeName = (productName || "product")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  const filename = `${safeName || "product"}-${imageIndex + 1}.${getImageExtension(imageUrl)}`;
  const downloadUrl = buildDownloadUrl(imageUrl, filename);

  try {
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
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

function ProductShareMenu({ productName, shareUrl }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

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

  const shareText = `Check out ${productName} on Bulk Mobile Mart`;

  const shareOptions = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: "WA",
      iconClass: "bg-green-500 text-white",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: "f",
      iconClass: "bg-blue-600 text-white",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      id: "twitter",
      label: "X",
      icon: "X",
      iconClass: "bg-black text-white",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      id: "email",
      label: "Email",
      icon: "@",
      iconClass: "bg-mobile-surface text-text-primary",
      href: `mailto:?subject=${encodeURIComponent(productName)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
    },
  ];

  const handleNativeShare = async () => {
    if (!navigator.share) return false;

    try {
      await navigator.share({
        title: productName,
        text: shareText,
        url: shareUrl,
      });
      setOpen(false);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
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
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-text-secondary transition hover:border-primary hover:text-primary"
        aria-label="Share product"
        aria-expanded={open}
      >
        <ShareIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-border-light bg-white p-3 shadow-lg">
          <p className="mb-3 text-sm font-semibold text-text-primary">Share this product</p>

          <div className="grid grid-cols-4 gap-2">
            {shareOptions.map((option) => (
              <a
                key={option.id}
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1 rounded-md px-1 py-2 text-center transition hover:bg-mobile-surface"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${option.iconClass}`}
                >
                  {option.icon}
                </span>
                <span className="text-[10px] font-medium text-text-secondary">{option.label}</span>
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border-light px-3 py-2 text-sm font-semibold text-text-primary transition hover:bg-mobile-surface"
          >
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}

function getBulkTiers(basePrice) {
  return [
    { qty: "10 - 49", price: basePrice },
    { qty: "50 - 99", price: Math.round(basePrice * 0.94 * 100) / 100 },
    { qty: "100+", price: Math.round(basePrice * 0.88 * 100) / 100 },
  ];
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

function MobileStoreHeader({ cartCount }) {
  return (
    <div className="border-b border-border-light bg-white px-4 py-2.5">
      <div className="relative flex h-10 items-center justify-between">
        <Link
          to="/product"
          className="flex h-9 w-9 items-center justify-center text-text-primary"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Link>

        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
          <img src={LOGO_URL} alt="BulkMobileMart" className="h-9 w-auto object-contain" />
        </Link>

        <Link
          to="/cart"
          className="relative flex h-9 w-9 items-center justify-center text-text-primary"
          aria-label="Cart"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        </Link>
      </div>
    </div>
  );
}

function MobileTopNav({ cartCount }) {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm lg:hidden">
        <MobileStoreHeader cartCount={cartCount} />
      </header>
      <div className="h-[61px] shrink-0 lg:hidden" aria-hidden="true" />
    </>
  );
}

function ThumbnailCarousel({ images, activeImage, onSelect }) {
  if (!images.length) return null;

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

function ActionButtons({ inStock, addedFeedback, onAddToCart, onBuyNow, className = "" }) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={!inStock}
        className="flex-1 rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {addedFeedback ? "Added!" : "Add to Cart"}
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
  const { addToCart, cartCount } = useCart();
  const { openAuthModal } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [quantity, setQuantity] = useState(DEFAULT_MOQ);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getProductById(id);
        setProduct(data.data);
        setActiveImage(0);
        setActiveTab("description");
        setQuantity(DEFAULT_MOQ);
      } catch {
        setProduct(null);
        setError("Product not found.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const images = useMemo(() => {
    if (!product?.productImages?.length) return [];
    const list = [...product.productImages];
    while (list.length < 4 && list.length > 0) {
      list.push(list[0]);
    }
    return list.slice(0, 4);
  }, [product]);

  const bulkTiers = useMemo(
    () => (product ? getBulkTiers(product.discountedPrice) : []),
    [product]
  );

  const handleAddToCart = async () => {
    if (!product) return;
    const result = await addToCart(product, quantity);
    if (result?.requiresLogin) {
      openAuthModal("login");
      return;
    }
    if (result?.success) {
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    const result = await addToCart(product, quantity, { buyNow: true });
    if (result?.requiresLogin) {
      openAuthModal("login");
      return;
    }
    if (result?.success) navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-28 lg:pb-10">
        <MobileTopNav cartCount={cartCount} />
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
        <MobileTopNav cartCount={cartCount} />
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
  const inStock = product.stock > 0;
  const rating = product.ratings || 4.5;
  const maxQuantity = inStock ? Math.max(product.stock, DEFAULT_MOQ) : DEFAULT_MOQ;

  return (
    <div className="min-h-screen bg-white pb-24 text-text-primary lg:pb-10">
      <MobileTopNav cartCount={cartCount} />
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
              {images[activeImage] && (
                <button
                  type="button"
                  onClick={() =>
                    downloadProductImage(images[activeImage], product.name, activeImage)
                  }
                  className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border-light bg-white/95 text-text-secondary shadow-sm transition hover:border-primary hover:text-primary"
                  aria-label="Download image"
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
                productName={product.name}
                shareUrl={typeof window !== "undefined" ? window.location.href : ""}
              />
            </div>
            <p className="mt-1 text-sm text-text-secondary">{productSku(product)}</p>

            <div className="mt-2">
              <StarRating rating={rating} reviewCount={REVIEW_COUNT} />
            </div>

            <p className="mt-3 text-3xl font-bold text-primary lg:mt-4 lg:text-[2rem] xl:text-4xl">
              {formatPrice(product.discountedPrice)}
            </p>

            <p className="mt-2 text-sm font-medium text-text-primary">
              MOQ: {DEFAULT_MOQ} Pieces
            </p>

            <div className="mt-2">
              <QuantitySelector
                quantity={quantity}
                min={DEFAULT_MOQ}
                max={maxQuantity}
                disabled={!inStock}
                onDecrease={() => setQuantity((prev) => Math.max(DEFAULT_MOQ, prev - 1))}
                onIncrease={() => setQuantity((prev) => Math.min(maxQuantity, prev + 1))}
              />
            </div>

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
                      <tr key={tier.qty} className="border-t border-border-light">
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

            <ActionButtons
              inStock={inStock}
              addedFeedback={addedFeedback}
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
              <ul className="space-y-2 text-text-primary">
                <li>
                  <span className="font-semibold">Brand: </span>
                  {product.brandName}
                </li>
                <li>
                  <span className="font-semibold">Category: </span>
                  {category}
                </li>
                <li>
                  <span className="font-semibold">Subcategory: </span>
                  {product.subcategory}
                </li>
                {product.warranty && (
                  <li>
                    <span className="font-semibold">Warranty: </span>
                    {product.warranty}
                  </li>
                )}
                {product.features?.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
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
