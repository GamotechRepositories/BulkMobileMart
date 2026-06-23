import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../api/api";
import { useProductCartActions } from "../hooks/useProductCartActions";
import CategoryProductLayout, {
  AllProductsLayout,
  DesktopCategorySidebar,
  MobileCategoryProductLayout,
  ProductResultsGrid,
} from "../components/product/CategoryProductLayout";

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4.5h18M6 9.75h12M9 15h6M10.5 20.25h3"
      />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
}

function MobileProductToolbar({ title, backTo, onToggleSort, showActions = true }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="inline-flex min-w-0 shrink items-center gap-0.5 text-text-primary"
      >
        <svg
          className="h-[18px] w-[18px] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        {title ? (
          <span className="truncate text-[15px] font-bold leading-none">{title}</span>
        ) : null}
      </button>

      {showActions && (
        <>
          <button
            type="button"
            className="ml-auto flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border-light px-3 py-1.5 text-xs font-semibold text-text-primary"
          >
            <FilterIcon />
            Filter
          </button>
          <button
            type="button"
            onClick={onToggleSort}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border-light px-3 py-1.5 text-xs font-semibold text-text-primary"
          >
            <SortIcon />
            Sort
          </button>
        </>
      )}
    </div>
  );
}

function FilteredProductsView({
  products,
  categories,
  loading,
  pageTitle,
  emptyMessage,
  backTo = "/",
  sortBy,
  showSort,
  onToggleSort,
  onSortChange,
  onGetCartQuantity,
  onIncrease,
  onDecrease,
}) {
  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "price-asc") {
      list.sort((a, b) => (a.discountedPrice ?? a.price) - (b.discountedPrice ?? b.price));
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => (b.discountedPrice ?? b.price) - (a.discountedPrice ?? a.price));
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [products, sortBy]);

  return (
    <div className="min-h-screen bg-mobile-bg pb-6 lg:flex lg:h-[calc(100vh-108px)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-0">
      <div className="lg:hidden">
        <MobileProductToolbar
          title={pageTitle}
          backTo={backTo}
          onToggleSort={onToggleSort}
        />
        {showSort && (
          <div className="border-b border-border-light bg-white px-4 py-1.5">
            {[
              { id: "default", label: "Default" },
              { id: "price-asc", label: "Price: Low to High" },
              { id: "price-desc", label: "Price: High to Low" },
              { id: "name", label: "Name A-Z" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSortChange(option.id)}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                  sortBy === option.id
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-text-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <div className="bg-mobile-bg px-3 py-3">
          <ProductResultsGrid
            products={sortedProducts}
            loading={loading}
            onAdd={onIncrease}
            onGetCartQuantity={onGetCartQuantity}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            emptyMessage={emptyMessage}
          />
        </div>
      </div>

      <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-[240px_1fr] bg-mobile-bg xl:grid-cols-[260px_1fr]">
          <DesktopCategorySidebar categories={categories} activeCategory="" />
          <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto border-l border-border-light bg-white px-3 py-4 lg:px-6 lg:py-5">
            <h1 className="mb-4 text-xl font-bold text-text-primary">{pageTitle}</h1>
            <ProductResultsGrid
              products={sortedProducts}
              loading={loading}
              onAdd={onIncrease}
              onGetCartQuantity={onGetCartQuantity}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              emptyMessage={emptyMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchResultsView(props) {
  const { searchQuery, ...rest } = props;

  return (
    <FilteredProductsView
      {...rest}
      pageTitle={`Results for "${searchQuery}"`}
      emptyMessage={`No products found for "${searchQuery}".`}
      backTo="/product"
    />
  );
}

function Product() {
  const [searchParams] = useSearchParams();
  const categoryName = searchParams.get("categoryName")?.trim() || "";
  const searchQuery = searchParams.get("q")?.trim() || "";
  const brandName = searchParams.get("brandName")?.trim() || "";
  const justArrived = searchParams.get("justArrived") === "true";
  const hotSelling = searchParams.get("hotSelling") === "true";

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("default");
  const [showSort, setShowSort] = useState(false);

  const { getCartQuantity, handleIncrease, handleDecrease } = useProductCartActions();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (categoryName) params.categoryName = categoryName;
        if (searchQuery) params.q = searchQuery;
        if (brandName) params.brandName = brandName;
        if (justArrived) params.justArrived = true;
        if (hotSelling) params.hotSelling = true;

        const [categoriesRes, productsRes] = await Promise.all([
          getCategories(),
          getProducts(params),
        ]);

        setCategories(categoriesRes.data.data || []);
        setProducts(productsRes?.data?.data || []);
      } catch {
        setCategories([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryName, searchQuery, brandName, justArrived, hotSelling]);


  if (brandName && !categoryName && !searchQuery) {
    return (
      <FilteredProductsView
        products={products}
        categories={categories}
        loading={loading}
        pageTitle={brandName}
        emptyMessage={`No products found for brand "${brandName}".`}
        backTo="/"
        sortBy={sortBy}
        showSort={showSort}
        onToggleSort={() => setShowSort((prev) => !prev)}
        onSortChange={(id) => {
          setSortBy(id);
          setShowSort(false);
        }}
        onGetCartQuantity={getCartQuantity}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
      />
    );
  }

  if (searchQuery && !categoryName) {
    return (
      <SearchResultsView
        products={products}
        categories={categories}
        loading={loading}
        searchQuery={searchQuery}
        sortBy={sortBy}
        showSort={showSort}
        onToggleSort={() => setShowSort((prev) => !prev)}
        onSortChange={(id) => {
          setSortBy(id);
          setShowSort(false);
        }}
        onGetCartQuantity={getCartQuantity}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
      />
    );
  }

  if (categoryName) {
    return (
      <div className="min-h-screen bg-mobile-bg pb-6 lg:flex lg:h-[calc(100vh-108px)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:bg-white lg:pb-0">
        <MobileCategoryProductLayout
          categories={categories}
          categoryName={categoryName}
          products={products}
          loading={loading}
          onAdd={handleIncrease}
          onGetCartQuantity={getCartQuantity}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          emptyMessage="No products found in this category yet."
        />

        <CategoryProductLayout
          categories={categories}
          activeCategory={categoryName}
          categoryName={categoryName}
          products={products}
          loading={loading}
          onAdd={handleIncrease}
          onGetCartQuantity={getCartQuantity}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          emptyMessage="No products found in this category yet."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mobile-bg pb-6 lg:flex lg:h-[calc(100vh-108px)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:bg-white lg:pb-0">
      <AllProductsLayout
        categories={categories}
        products={products}
        loading={loading}
        onAdd={handleIncrease}
        onGetCartQuantity={getCartQuantity}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
        emptyMessage="No products available yet."
      />
    </div>
  );
}

export default Product;
