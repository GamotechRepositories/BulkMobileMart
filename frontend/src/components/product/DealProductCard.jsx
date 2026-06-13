import { Link } from "react-router-dom";
import WishlistButton from "./WishlistButton";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

function DealProductCard({ product, onAdd, layout = "scroll", addDisabled = false }) {
  const image = product.productImages?.[0];
  const subtitle =
    product.subcategory ||
    product.features?.[0] ||
    product.brandName ||
    product.sub;
  const inStock = (product.stock ?? 0) > 0;
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
            {formatPrice(product.discountedPrice ?? product.price)}
          </p>
        </Link>
      </div>
      <button
        type="button"
        onClick={() => onAdd(product)}
        disabled={disabled}
        className="mt-2 w-full rounded-lg bg-primary py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2 sm:text-sm"
      >
        ADD
      </button>
    </div>
  );
}

export default DealProductCard;
