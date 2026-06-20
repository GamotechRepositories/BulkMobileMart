import { useMemo } from "react";
import {
  adminFilterInputClass,
  btnPrimary,
  btnSecondary,
  labelClass,
} from "./adminStyles";
import { formatPrice } from "./sections/adminOrderUtils";
import {
  getAvailableColors,
  getCartAdjustStep,
  getMinOrderQuantity,
  getUnitPriceForQuantity,
  isMultiVariant,
} from "../../utils/productPricing";

const btnCompactPrimary = `${btnPrimary} !px-2.5 !py-1.5 text-xs`;
const btnCompactSecondary = `${btnSecondary} !px-2.5 !py-1.5 text-xs`;
const btnAddedClass =
  "inline-flex w-full items-center justify-center rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 sm:w-auto";

function ProductThumb({ product, className = "h-12 w-12" }) {
  const image = product?.productImages?.[0] || "";
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50`}
    >
      {image ? (
        <img src={image} alt={product?.name || "Product"} className="h-full w-full object-contain p-0.5" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">—</div>
      )}
    </div>
  );
}

export function getDefaultDraft(product) {
  const variantName = isMultiVariant(product) ? product.variants?.[0]?.name || "" : "";
  const colors = getAvailableColors(product, variantName);
  return {
    variantName,
    colorName: colors.length === 1 ? colors[0].name || "" : "",
    quantity: getMinOrderQuantity(product, variantName),
  };
}

function needsConfiguration(product) {
  if (isMultiVariant(product)) return true;
  return getAvailableColors(product).length > 0;
}

export default function ProductSearchCard({
  product,
  draft,
  isExpanded,
  isInOrder,
  onToggleExpand,
  onQuickAdd,
  onDraftChange,
  onConfirmAdd,
  onError,
}) {
  const colors = useMemo(
    () => getAvailableColors(product, draft.variantName),
    [product, draft.variantName]
  );
  const step = getCartAdjustStep(product, draft.variantName);
  const minQty = getMinOrderQuantity(product, draft.variantName);
  const unitPrice = getUnitPriceForQuantity(product, draft.quantity, draft.variantName);
  const configurable = needsConfiguration(product);

  const adjustQty = (delta) => {
    onDraftChange({
      ...draft,
      quantity: Math.max(minQty, draft.quantity + delta * step),
    });
  };

  const handleConfirm = () => {
    if (isMultiVariant(product) && !draft.variantName.trim()) {
      onError?.("Select a variant");
      return;
    }
    if (colors.length > 0 && !draft.colorName.trim()) {
      onError?.("Select a color");
      return;
    }
    onConfirmAdd(product, draft);
  };

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm sm:p-3">
      <div className="flex min-w-0 gap-2.5">
        <ProductThumb product={product} />

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-text-primary">
              {product.name}
            </h3>
            <p className="mt-0.5 truncate text-[10px] text-text-secondary">
              {product.brandName || "No brand"}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-text-primary">
              From {formatPrice(getUnitPriceForQuantity(product, minQty, draft.variantName))}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:items-stretch">
            {isInOrder ? (
              <span className={btnAddedClass}>Added</span>
            ) : configurable ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className={`${isExpanded ? btnCompactSecondary : btnCompactPrimary} w-full sm:w-auto`}
              >
                {isExpanded ? "Close" : "Add"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onQuickAdd}
                className={`${btnCompactPrimary} w-full sm:w-auto`}
              >
                Add
              </button>
            )}
            {isInOrder && configurable ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className={`${isExpanded ? btnCompactSecondary : btnCompactPrimary} w-full sm:w-auto`}
              >
                {isExpanded ? "Close" : "Add variant"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-2.5 space-y-2.5 border-t border-neutral-100 pt-2.5">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {isMultiVariant(product) ? (
              <div className="col-span-2 min-w-0 lg:col-span-1">
                <label className={labelClass}>Variant</label>
                <select
                  value={draft.variantName}
                  onChange={(e) => {
                    const variantName = e.target.value;
                    const nextColors = getAvailableColors(product, variantName);
                    onDraftChange({
                      variantName,
                      colorName: nextColors.length === 1 ? nextColors[0].name || "" : "",
                      quantity: getMinOrderQuantity(product, variantName),
                    });
                  }}
                  className={adminFilterInputClass}
                >
                  <option value="">Select variant</option>
                  {product.variants.map((variant) => (
                    <option key={variant.name} value={variant.name}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {colors.length > 0 ? (
              <div className="col-span-2 min-w-0 lg:col-span-1">
                <label className={labelClass}>Color</label>
                <select
                  value={draft.colorName}
                  onChange={(e) => onDraftChange({ ...draft, colorName: e.target.value })}
                  className={adminFilterInputClass}
                >
                  <option value="">Select color</option>
                  {colors.map((color) => (
                    <option key={color.name} value={color.name}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="col-span-2 min-w-0 lg:col-span-1">
              <label className={labelClass}>Quantity</label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button type="button" onClick={() => adjustQty(-1)} className={btnCompactSecondary}>
                  −
                </button>
                <input
                  type="number"
                  min={minQty}
                  step={step}
                  value={draft.quantity}
                  onChange={(e) =>
                    onDraftChange({
                      ...draft,
                      quantity: Math.max(minQty, Number(e.target.value) || minQty),
                    })
                  }
                  className={`${adminFilterInputClass} min-w-0 flex-1 text-center`}
                />
                <button type="button" onClick={() => adjustQty(1)} className={btnCompactSecondary}>
                  +
                </button>
              </div>
            </div>

            <div className="col-span-2 flex items-end lg:col-span-1">
              <button
                type="button"
                onClick={handleConfirm}
                className={`${btnCompactPrimary} w-full sm:w-auto`}
              >
                Add to Order
              </button>
            </div>
          </div>
          <p className="text-[10px] text-text-secondary">
            Unit price: {formatPrice(unitPrice)} · Line total:{" "}
            {formatPrice(unitPrice * draft.quantity)}
          </p>
        </div>
      ) : null}
    </article>
  );
}
