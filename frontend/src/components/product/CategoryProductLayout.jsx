import { Link, useSearchParams } from "react-router-dom";
import DealProductCard from "./DealProductCard";
import SidebarCategoryImage from "./SidebarCategoryImage";

function buildCategoryUrl(categoryName, params = {}) {
  const search = new URLSearchParams();
  search.set("categoryName", categoryName);
  if (params.subcategory) search.set("subcategory", params.subcategory);
  if (params.brand) search.set("brand", params.brand);
  if (params.minPrice) search.set("minPrice", params.minPrice);
  if (params.maxPrice) search.set("maxPrice", params.maxPrice);
  if (params.sort) search.set("sort", params.sort);
  return `/product?${search.toString()}`;
}

function useCategoryFilters(products, categoryName) {
  const [searchParams, setSearchParams] = useSearchParams();

  const subcategory = searchParams.get("subcategory")?.trim() || "";
  const selectedBrand = searchParams.get("brand")?.trim() || "";
  const minPrice = searchParams.get("minPrice")?.trim() || "";
  const maxPrice = searchParams.get("maxPrice")?.trim() || "";
  const sortBy = searchParams.get("sort")?.trim() || "default";

  const availableBrands = [...new Set(products.map((p) => p.brandName).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );

  const filteredProducts = products.filter((product) => {
    if (subcategory && product.subcategory?.toLowerCase() !== subcategory.toLowerCase()) {
      return false;
    }
    if (selectedBrand && product.brandName?.toLowerCase() !== selectedBrand.toLowerCase()) {
      return false;
    }
    const price = product.discountedPrice ?? product.price ?? 0;
    if (minPrice && price < Number(minPrice)) return false;
    if (maxPrice && price > Number(maxPrice)) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") {
      return (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price);
    }
    if (sortBy === "price-desc") {
      return (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price);
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "brand") {
      return (a.brandName || "").localeCompare(b.brandName || "");
    }
    return 0;
  });

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    next.set("categoryName", categoryName);
    if (subcategory) next.set("subcategory", subcategory);
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = Boolean(selectedBrand || minPrice || maxPrice || sortBy !== "default");

  return {
    subcategory,
    selectedBrand,
    minPrice,
    maxPrice,
    sortBy,
    availableBrands,
    sortedProducts,
    updateParam,
    clearFilters,
    hasActiveFilters,
  };
}

function useAllProductsFilters(products) {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedBrand = searchParams.get("brand")?.trim() || "";
  const minPrice = searchParams.get("minPrice")?.trim() || "";
  const maxPrice = searchParams.get("maxPrice")?.trim() || "";
  const sortBy = searchParams.get("sort")?.trim() || "default";

  const availableBrands = [...new Set(products.map((p) => p.brandName).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );

  const filteredProducts = products.filter((product) => {
    if (selectedBrand && product.brandName?.toLowerCase() !== selectedBrand.toLowerCase()) {
      return false;
    }
    const price = product.discountedPrice ?? product.price ?? 0;
    if (minPrice && price < Number(minPrice)) return false;
    if (maxPrice && price > Number(maxPrice)) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") {
      return (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price);
    }
    if (sortBy === "price-desc") {
      return (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price);
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "brand") {
      return (a.brandName || "").localeCompare(b.brandName || "");
    }
    return 0;
  });

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = Boolean(selectedBrand || minPrice || maxPrice || sortBy !== "default");

  return {
    selectedBrand,
    minPrice,
    maxPrice,
    sortBy,
    availableBrands,
    sortedProducts,
    updateParam,
    clearFilters,
    hasActiveFilters,
  };
}

function CompactProductFilters({
  brands,
  selectedBrand,
  onBrandChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}) {
  return (
    <div className="ml-1 flex shrink-0 items-center gap-1 sm:ml-2">
      <select
        value={selectedBrand}
        onChange={(e) => onBrandChange(e.target.value)}
        className="h-6 max-w-[96px] rounded border border-border-light bg-white px-1.5 text-[10px] lowercase text-text-primary sm:max-w-[110px] sm:text-[11px]"
      >
        <option value="">brand name</option>
        {brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        placeholder="min"
        value={minPrice}
        onChange={(e) => onMinPriceChange(e.target.value)}
        className="h-6 w-[52px] rounded border border-border-light bg-white px-1.5 text-[10px] lowercase placeholder:text-text-muted sm:w-[56px] sm:text-[11px]"
      />
      <input
        type="number"
        min={0}
        placeholder="max"
        value={maxPrice}
        onChange={(e) => onMaxPriceChange(e.target.value)}
        className="h-6 w-[52px] rounded border border-border-light bg-white px-1.5 text-[10px] lowercase placeholder:text-text-muted sm:w-[56px] sm:text-[11px]"
      />
    </div>
  );
}

function CategoryFilterToolbar({
  categoryName,
  subcategories,
  activeSubcategory,
  brands,
  selectedBrand,
  onBrandChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}) {
  const [searchParams] = useSearchParams();
  const preservedFilters = {
    brand: searchParams.get("brand")?.trim() || "",
    minPrice: searchParams.get("minPrice")?.trim() || "",
    maxPrice: searchParams.get("maxPrice")?.trim() || "",
  };
  const pills = ["All", ...(subcategories || [])];

  return (
    <div className="hidden shrink-0 flex-row items-center gap-2 bg-white px-3 py-2 sm:px-4 lg:flex">
      <div className="hide-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {pills.map((pill) => {
          const isAll = pill === "All";
          const isActive = isAll ? !activeSubcategory : activeSubcategory === pill;
          const to = isAll
            ? buildCategoryUrl(categoryName, preservedFilters)
            : buildCategoryUrl(categoryName, { ...preservedFilters, subcategory: pill });

          return (
            <Link
              key={pill}
              to={to}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-normal transition sm:text-[11px] ${
                isActive
                  ? "border-primary bg-primary text-white"
                  : "border-border-light bg-white text-text-primary hover:border-primary/40"
              }`}
            >
              {pill}
            </Link>
          );
        })}
      </div>

      <CompactProductFilters
        brands={brands}
        selectedBrand={selectedBrand}
        onBrandChange={onBrandChange}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={onMinPriceChange}
        onMaxPriceChange={onMaxPriceChange}
      />
    </div>
  );
}

function AllProductsFilterToolbar({
  brands,
  selectedBrand,
  onBrandChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}) {
  return (
    <div className="hidden shrink-0 flex-row items-center gap-2 bg-white px-3 py-2 sm:px-4 lg:flex">
      <div className="min-w-0 flex-1" />
      <CompactProductFilters
        brands={brands}
        selectedBrand={selectedBrand}
        onBrandChange={onBrandChange}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={onMinPriceChange}
        onMaxPriceChange={onMaxPriceChange}
      />
    </div>
  );
}

function ProductResultsGrid({ products, loading, onAdd, emptyMessage }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-[260px] animate-pulse rounded-xl border border-border-light bg-white"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="py-12 text-center text-sm text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <DealProductCard key={product._id} product={product} onAdd={onAdd} layout="grid" />
      ))}
    </div>
  );
}

function CategoryListBox({ categories, activeCategory, variant = "desktop" }) {
  const allActive = !activeCategory;

  if (variant === "mobile") {
    return (
      <div className="mx-3 mt-2 bg-white p-2.5">
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          <Link
            to="/product"
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] transition ${
              allActive
                ? "bg-primary/10 text-primary"
                : "text-text-primary hover:bg-mobile-surface"
            }`}
          >
            <SidebarCategoryImage showGrid name="All Products" />
            <span>All</span>
          </Link>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.categoryName;
            return (
              <Link
                key={cat._id}
                to={buildCategoryUrl(cat.categoryName)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] transition ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-primary hover:bg-mobile-surface"
                }`}
              >
                <SidebarCategoryImage image={cat.categoryImage} name={cat.categoryName} />
                <span className="max-w-[72px] truncate">{cat.categoryName}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border-light bg-white">
      <h2 className="shrink-0 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Categories
      </h2>
      <nav className="hide-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        <Link
          to="/product"
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition ${
            allActive
              ? "bg-primary/10 font-semibold text-primary"
              : "font-medium text-text-primary hover:bg-mobile-surface"
          }`}
        >
          <SidebarCategoryImage showGrid name="All Products" />
          <span>All Products</span>
        </Link>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.categoryName;
          return (
            <Link
              key={cat._id}
              to={buildCategoryUrl(cat.categoryName)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition ${
                isActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "font-medium text-text-primary hover:bg-mobile-surface"
              }`}
            >
              <SidebarCategoryImage image={cat.categoryImage} name={cat.categoryName} />
              <span className="min-w-0 truncate">{cat.categoryName}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function DesktopCategorySidebar({ categories, activeCategory }) {
  return <CategoryListBox categories={categories} activeCategory={activeCategory} variant="desktop" />;
}

function CategoryProductMain({
  categories,
  activeCategory,
  categoryName,
  products,
  loading,
  onAdd,
  emptyMessage,
}) {
  const filters = useCategoryFilters(products, categoryName);
  const activeCategoryDoc = categories.find(
    (cat) => cat.categoryName.toLowerCase() === categoryName.toLowerCase()
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CategoryFilterToolbar
        categoryName={categoryName}
        subcategories={activeCategoryDoc?.subcategories || []}
        activeSubcategory={filters.subcategory}
        brands={filters.availableBrands}
        selectedBrand={filters.selectedBrand}
        onBrandChange={(value) => filters.updateParam("brand", value)}
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        onMinPriceChange={(value) => filters.updateParam("minPrice", value)}
        onMaxPriceChange={(value) => filters.updateParam("maxPrice", value)}
      />
      <div className="hide-scrollbar flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        <ProductResultsGrid
          products={filters.sortedProducts}
          loading={loading}
          onAdd={onAdd}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}

function AllProductsMain({ products, loading, onAdd, emptyMessage }) {
  const filters = useAllProductsFilters(products);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AllProductsFilterToolbar
        brands={filters.availableBrands}
        selectedBrand={filters.selectedBrand}
        onBrandChange={(value) => filters.updateParam("brand", value)}
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        onMinPriceChange={(value) => filters.updateParam("minPrice", value)}
        onMaxPriceChange={(value) => filters.updateParam("maxPrice", value)}
      />
      <div className="hide-scrollbar flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        <ProductResultsGrid
          products={filters.sortedProducts}
          loading={loading}
          onAdd={onAdd}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}

export {
  buildCategoryUrl,
  CategoryFilterToolbar,
  CategoryListBox,
  DesktopCategorySidebar,
  ProductResultsGrid,
};

function ProductPageTwoBoxLayout({ categories, activeCategory, children }) {
  return (
    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-[260px_1fr] bg-white xl:grid-cols-[280px_1fr]">
      <CategoryListBox categories={categories} activeCategory={activeCategory} variant="desktop" />
      <div className="flex min-h-0 flex-col overflow-hidden bg-white">{children}</div>
    </div>
  );
}

export default function CategoryProductLayout({
  categories,
  activeCategory,
  categoryName,
  products,
  loading,
  onAdd,
  emptyMessage,
}) {
  return (
    <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col">
      <ProductPageTwoBoxLayout categories={categories} activeCategory={activeCategory}>
        <CategoryProductMain
          categories={categories}
          activeCategory={activeCategory}
          categoryName={categoryName}
          products={products}
          loading={loading}
          onAdd={onAdd}
          emptyMessage={emptyMessage}
        />
      </ProductPageTwoBoxLayout>
    </div>
  );
}

export function AllProductsLayout({ categories, products, loading, onAdd, emptyMessage }) {
  return (
    <>
      <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col">
        <ProductPageTwoBoxLayout categories={categories} activeCategory="">
          <AllProductsMain
            products={products}
            loading={loading}
            onAdd={onAdd}
            emptyMessage={emptyMessage}
          />
        </ProductPageTwoBoxLayout>
      </div>
      <div className="lg:hidden">
        <CategoryListBox categories={categories} activeCategory="" variant="mobile" />
        <div className="mx-3 mb-3 overflow-hidden bg-white">
          <AllProductsMain
            products={products}
            loading={loading}
            onAdd={onAdd}
            emptyMessage={emptyMessage}
          />
        </div>
      </div>
    </>
  );
}

export function MobileCategoryProductLayout({
  categories,
  categoryName,
  products,
  loading,
  onAdd,
  emptyMessage,
}) {
  return (
    <div className="lg:hidden">
      <CategoryListBox categories={categories} activeCategory={categoryName} variant="mobile" />
      <div className="mx-3 mb-3 overflow-hidden bg-white">
        <CategoryProductMain
          categories={categories}
          categoryName={categoryName}
          products={products}
          loading={loading}
          onAdd={onAdd}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}
