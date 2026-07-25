import { useBrandsQuery } from "../../hooks/queries/useBrandsQuery";

export function ProductFiltersBar({
  selectedBrand = "",
  onBrandChange,
  minPrice = "",
  maxPrice = "",
  onMinPriceChange,
  onMaxPriceChange,
  showBrand = true,
  onClear,
  hasActiveFilters = false,
  className = "",
}) {
  const { data: brands = [], isLoading: brandsLoading } = useBrandsQuery();
  const brandNames = brands.map((brand) => brand.brandName).filter(Boolean);

  return (
    <div className={`flex flex-nowrap items-center gap-1.5 bg-white px-2 py-1.5 sm:gap-2 sm:px-3 ${className}`}>
      {showBrand ? (
        <select
          value={selectedBrand}
          onChange={(e) => onBrandChange?.(e.target.value)}
          disabled={brandsLoading}
          aria-label="Brand name"
          className="h-8 min-w-0 flex-1 rounded-md border border-border-light bg-white px-1.5 text-[11px] text-text-primary sm:h-8 sm:max-w-[160px] sm:flex-none sm:px-2 sm:text-xs"
        >
          <option value="">all brands</option>
          {brandNames.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      ) : null}

      <input
        type="number"
        min={0}
        placeholder="min"
        value={minPrice}
        onChange={(e) => onMinPriceChange?.(e.target.value)}
        aria-label="Min price"
        className="h-8 w-[64px] shrink-0 rounded-md border border-border-light bg-white px-1.5 text-[11px] placeholder:text-text-muted sm:w-[80px] sm:text-xs"
      />

      <input
        type="number"
        min={0}
        placeholder="max"
        value={maxPrice}
        onChange={(e) => onMaxPriceChange?.(e.target.value)}
        aria-label="Max price"
        className="h-8 w-[64px] shrink-0 rounded-md border border-border-light bg-white px-1.5 text-[11px] placeholder:text-text-muted sm:w-[80px] sm:text-xs"
      />

      {hasActiveFilters && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="h-8 shrink-0 rounded-md border border-border-light px-2 text-[10px] font-semibold text-text-secondary sm:px-2.5 sm:text-xs"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

export default ProductFiltersBar;
