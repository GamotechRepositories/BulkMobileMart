import { Link } from "react-router-dom";
import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";
import ProductImageFrame from "./ProductImageFrame";
import ProductPriceDisplay from "./ProductPriceDisplay";
import { getTotalProductStock } from "../../utils/productPricing";

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
  const handleAdd = onIncrease || onAdd;

  const layoutClass =
    layout === "scroll" ? "w-[150px] shrink-0 sm:w-[165px]" : "w-full";

  const productUrl =
    product._id?.length > 10 ? `/product/${product._id}` : "/product";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl bg-white transition ${layoutClass}`}
    >
      <div className="relative">
        <div className="absolute right-1.5 top-1.5 z-10">
          <WishlistButton product={product} className="!border-0" />
        </div>
        <Link to={productUrl} className="block">
          <ProductImageFrame src={image} alt={product.name} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-2 sm:p-2.5">
        <Link to={productUrl} className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-bold text-text-primary sm:text-base">
            {product.name}
          </h3>
          <p className="line-clamp-1 text-[11px] text-text-secondary sm:text-xs">
            {subtitle}
          </p>
          <ProductPriceDisplay product={product} size="sm" className="mt-0.5" />
        </Link>

        {cartQuantity > 0 ? (
          <div className="mt-1.5 inline-flex w-full items-center overflow-hidden rounded-lg border border-border-light bg-white">
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
          <AddToCartButton
            onClick={(e) => (onIncrease ?? onAdd)?.(product, e.currentTarget)}
            disabled={disabled}
            className="mt-1.5 w-full"
          />
        )}
      </div>
    </div>
  );
}

export default DealProductCard;
