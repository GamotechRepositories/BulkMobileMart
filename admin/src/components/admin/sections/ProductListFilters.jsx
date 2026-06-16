import {
  adminFilterCardClass,
  adminFilterInputClass,
} from "../adminStyles";

const SORT_OPTIONS = [
  { value: "name", label: "Sort by Name" },
  { value: "price", label: "Sort by Price" },
  { value: "stock", label: "Sort by availability" },
  { value: "brand", label: "Sort by Brand" },
];

function ProductListFilters({
  products,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirToggle,
}) {
  const categoryCounts = products.reduce((acc, product) => {
    (product.categories || []).forEach((cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, {});

  const categories = Object.entries(categoryCounts).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="space-y-4">
      <div className={adminFilterCardClass}>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">Category Summary</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
              selectedCategory === "all"
                ? "bg-primary text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            All ({products.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                selectedCategory === cat
                  ? "bg-primary text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {cat} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className={adminFilterCardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className={`${adminFilterInputClass} min-w-0 flex-1`}
          />
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className={`${adminFilterInputClass} w-full min-w-[140px] sm:w-auto`}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onSortDirToggle}
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
              aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
            >
              {sortDir === "asc" ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductListFilters;
