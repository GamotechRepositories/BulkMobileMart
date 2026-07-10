import { getProductListPriceInfo } from "../../utils/productPricing";

const formatPrice = (amount, fractionDigits = 2) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);

const sizeStyles = {
  sm: {
    original: "text-[11px] text-neutral-400 line-through",
    sale: "text-sm font-bold text-text-primary",
  },
  md: {
    original: "text-xs text-neutral-400 line-through sm:text-sm",
    sale: "text-base font-bold text-text-primary sm:text-lg",
  },
  lg: {
    original: "text-sm text-neutral-400 line-through sm:text-base",
    sale: "text-2xl font-bold text-text-primary sm:text-3xl",
  },
};

function ProductPriceDisplay({
  product,
  variantName = "",
  size = "md",
  className = "",
}) {
  const { originalPrice, salePrice, hasDiscount } = getProductListPriceInfo(
    product,
    variantName
  );
  const styles = sizeStyles[size] || sizeStyles.md;

  if (!salePrice) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      {hasDiscount ? (
        <span className={styles.original}>{formatPrice(originalPrice)}</span>
      ) : null}
      <span className={styles.sale}>{formatPrice(salePrice)}</span>
    </div>
  );
}

export default ProductPriceDisplay;
