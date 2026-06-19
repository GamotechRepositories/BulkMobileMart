import { inputClass, labelClass } from "./adminStyles";

const EMPTY_SLAB = {
  maxQuantity: "",
  price: "",
  discountedPrice: "",
};

function getSlabStartQuantity(minOrderQuantity, slabs, index) {
  const moq = Number(minOrderQuantity);
  if (!Number.isFinite(moq) || moq < 1) {
    return "—";
  }

  let start = moq;
  for (let i = 0; i < index; i += 1) {
    const max = Number(slabs[i]?.maxQuantity);
    if (!Number.isFinite(max)) return "—";
    start = max + 1;
  }

  return start;
}

function VariantPricingFields({
  variant,
  onChange,
  showPricingType = true,
  showInStock = true,
}) {
  const updateField = (field, value) => {
    onChange({ ...variant, [field]: value });
  };

  const updateSlab = (index, field, value) => {
    const slabs = variant.slabs.map((slab, i) =>
      i === index ? { ...slab, [field]: value } : slab
    );
    onChange({ ...variant, slabs });
  };

  const addSlab = () => {
    onChange({ ...variant, slabs: [...variant.slabs, { ...EMPTY_SLAB }] });
  };

  const removeSlab = (index) => {
    onChange({
      ...variant,
      slabs:
        variant.slabs.length === 1
          ? [{ ...EMPTY_SLAB }]
          : variant.slabs.filter((_, i) => i !== index),
    });
  };

  const isBulk = variant.pricingType === "bulk";

  return (
    <div className="space-y-4">
      {showPricingType || showInStock ? (
        <div
          className={`grid items-center gap-2 sm:gap-4 ${
            showPricingType && showInStock ? "grid-cols-3" : showPricingType ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {showPricingType ? (
            <>
              <label className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <input
                  type="radio"
                  checked={variant.pricingType === "single"}
                  onChange={() => updateField("pricingType", "single")}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="leading-tight">Single price</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <input
                  type="radio"
                  checked={variant.pricingType === "bulk"}
                  onChange={() => updateField("pricingType", "bulk")}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="leading-tight">Bulk price</span>
              </label>
            </>
          ) : null}
          {showInStock ? (
            <label className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <input
                type="checkbox"
                checked={variant.inStock !== false}
                onChange={(e) => updateField("inStock", e.target.checked)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className="font-medium leading-tight text-text-primary">In stock</span>
            </label>
          ) : null}
        </div>
      ) : null}

      {isBulk ? (
        <div>
          <label className={labelClass}>Minimum order quantity *</label>
          <input
            type="number"
            required
            min="1"
            placeholder="e.g. 50"
            value={variant.bulkMinOrderQuantity}
            onChange={(e) => updateField("bulkMinOrderQuantity", e.target.value)}
            className={inputClass}
          />
        </div>
      ) : null}

      {!isBulk ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 [&>div]:min-w-0">
          <div>
            <label className={labelClass}>Price (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={variant.price}
              onChange={(e) => updateField("price", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Discounted price (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={variant.discountedPrice}
              onChange={(e) => updateField("discountedPrice", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 [&>div]:min-w-0">
            <div>
              <label className={labelClass}>Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={variant.price}
                onChange={(e) => updateField("price", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Discounted price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={variant.discountedPrice}
                onChange={(e) => updateField("discountedPrice", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Pricing slabs *</label>
            <div className="space-y-3">
              {variant.slabs.map((slab, index) => {
                const rangeStart = getSlabStartQuantity(
                  variant.bulkMinOrderQuantity,
                  variant.slabs,
                  index
                );
                const isLast = index === variant.slabs.length - 1;

                return (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-3 rounded-lg border border-border-light p-3 lg:grid-cols-5"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Range starts at
                      </label>
                      <div className="rounded-lg border border-border-light bg-mobile-surface px-3 py-2.5 text-sm text-text-primary">
                        {rangeStart}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Max qty {isLast ? "(optional)" : "*"}
                      </label>
                      <input
                        type="number"
                        required={!isLast}
                        min="1"
                        placeholder={isLast ? "Open-ended" : "e.g. 200"}
                        value={slab.maxQuantity}
                        onChange={(e) => updateSlab(index, "maxQuantity", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={slab.price}
                        onChange={(e) => updateSlab(index, "price", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Discounted price (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={slab.discountedPrice}
                        onChange={(e) => updateSlab(index, "discountedPrice", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-end">
                      {variant.slabs.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSlab(index)}
                          className="w-full rounded-lg border border-border-light px-3 py-2.5 text-sm text-red-600 transition hover:border-red-300 hover:bg-red-50"
                        >
                          Remove slab
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addSlab}
              className="mt-3 text-sm font-semibold text-accent hover:underline"
            >
              + Add pricing slab
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { EMPTY_SLAB };

export default VariantPricingFields;
