import { Link } from "react-router-dom";
import WishlistButton from "./WishlistButton";
import { formatProductPriceLabel, getTotalProductStock } from "../../utils/productPricing";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

function DealProductCard({
  product,
  onAdd,
  onIncrease,
  onDecrease,
  cartQuantity = 0,
  layout = "scroll",
  addDisabled = false,
}) {
  const image = product.productImages?.[0];
  const subtitle =
    product.subcategory ||
    product.features?.[0] ||
    product.brandName ||
    product.sub;
  const inStock = getTotalProductStock(product) > 0;
  const disabled = addDisabled || !inStock;

  const layoutClass =
    layout === "scroll" ? "w-[150px] shrink-0 sm:w-[165px]" : "w-full";

  return (
    <div
      className={`flex flex-col rounded-xl border border-border-light bg-white p-3 shadow-sm transition hover:shadow-md ${layoutClass}`}
    >
      <div className="relative">
        <div className="absolute right-1.5 top-1.5 z-10">
          <WishlistButton product={product} />
        </div>
        <Link to={product._id?.length > 10 ? `/product/${product._id}` : "/product"}>
          <div className="flex h-[100px] items-center justify-center overflow-hidden rounded-lg bg-mobile-surface sm:h-[110px] md:h-[130px] lg:h-[150px]">
            {image ? (
              <img
                src={image}
                alt={product.name}
                className="h-full w-full object-contain p-2"
                loading="lazy"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-white shadow-inner" />
            )}
          </div>
          <h3 className="mt-2 line-clamp-1 text-sm font-bold text-text-primary sm:text-base">
            {product.name}
          </h3>
          <p className="line-clamp-1 text-[11px] text-text-secondary sm:text-xs">
            {subtitle}
          </p>
          <p className="mt-1 text-sm font-bold text-primary sm:text-base">
            {formatProductPriceLabel(product, formatPrice)}
          </p>
        </Link>
      </div>
      {cartQuantity > 0 ? (
        <div className="mt-2 inline-flex w-full items-center overflow-hidden rounded-lg border border-border-light bg-white">
          <button
            type="button"
            onClick={() => onDecrease?.(product)}
            className="flex h-8 w-9 items-center justify-center text-base text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary sm:h-9 sm:w-10"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="flex h-8 flex-1 items-center justify-center border-x border-border-light text-sm font-bold text-text-primary sm:h-9">
            {cartQuantity}
          </span>
          <button
            type="button"
            onClick={() => onIncrease?.(product)}
            disabled={disabled}
            className="flex h-8 w-9 items-center justify-center text-base text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-10"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (onIncrease ? onIncrease(product) : onAdd(product))}
          disabled={disabled}
          className="mt-2 w-full rounded-lg bg-primary py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2 sm:text-sm"
        >
          ADD
        </button>
      )}
    </div>
  );
}

export default DealProductCard;
