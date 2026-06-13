import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

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
    <div className="flex items-center gap-2 border-b border-border-light bg-white px-3 py-2.5">
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
        <span className="truncate text-[15px] font-bold leading-none">{title}</span>
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

function ProductThumb({ src, alt }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <svg
          className="h-10 w-10 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="block h-full w-full object-contain p-1.5"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

function MobileProductCard({ product, onAdd }) {
  const inStock = (product.stock ?? 0) > 0;
  const discount = product.discountedPercent ?? 0;

  return (
    <article className="flex items-center gap-2.5 rounded-xl border border-border-light bg-white p-2.5">
      <Link
        to={`/product/${product._id}`}
        className="relative flex h-[104px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-light bg-mobile-surface"
      >
        <ProductThumb src={product.productImages?.[0]} alt={product.name} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/product/${product._id}`} className="min-w-0">
          <h2 className="line-clamp-1 text-base font-bold leading-tight text-text-primary">
            {product.name}
          </h2>
        </Link>

        <p className="text-xs leading-tight text-text-muted line-through">
          {formatPrice(product.price)}
        </p>
        <p className="text-lg font-bold leading-tight text-primary">
          {formatPrice(product.discountedPrice ?? product.price)}
        </p>
        {discount > 0 && (
          <p className="text-xs font-bold uppercase leading-tight text-green-600">
            Save {discount}%
          </p>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${inStock ? "text-green-600" : "text-red-500"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </p>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!inStock}
            className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

const CATEGORY_ICON_TYPES = [
  "charger",
  "cable",
  "powerbank",
  "earphone",
  "neckband",
  "adapter",
  "cover",
  "speaker",
  "watch",
  "glass",
];

function getCategoryIconType(name, index) {
  const n = name.toLowerCase();
  if (n.includes("charger")) return "charger";
  if (n.includes("cable")) return "cable";
  if (n.includes("power bank")) return "powerbank";
  if (n.includes("earphone") || n.includes("earbud")) return "earphone";
  if (n.includes("headphone") || n.includes("neckband")) return "neckband";
  if (n.includes("adapter")) return "adapter";
  if (n.includes("holder") || n.includes("cover")) return "cover";
  if (n.includes("speaker")) return "speaker";
  if (n.includes("watch")) return "watch";
  if (n.includes("glass") || n.includes("screen") || n.includes("protector"))
    return "glass";
  if (n.includes("batter")) return "powerbank";
  return CATEGORY_ICON_TYPES[index % CATEGORY_ICON_TYPES.length];
}

function SidebarCategoryIcon({ type, className = "h-5 w-5" }) {
  const icons = {
    grid: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </>
    ),
    charger: (
      <>
        <rect x="8" y="3" width="8" height="5" rx="1" />
        <rect x="10" y="8" width="4" height="3" />
        <rect x="9" y="11" width="6" height="8" rx="1" />
      </>
    ),
    earphone: (
      <>
        <path d="M7 10a5 5 0 0110 0v4a2.5 2.5 0 01-2.5 2.5h-.5v3h-3v-3H9A2.5 2.5 0 016.5 14V10z" />
        <circle cx="9" cy="9" r="1.5" />
        <circle cx="15" cy="9" r="1.5" />
      </>
    ),
    cable: (
      <>
        <rect x="4" y="9" width="4" height="6" rx="1" />
        <rect x="16" y="9" width="4" height="6" rx="1" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="2" fill="none" />
      </>
    ),
    neckband: (
      <>
        <path d="M6 11a6 6 0 0112 0v3a2 2 0 01-2 2h-1.5v2h-3v-2H8a2 2 0 01-2-2v-3z" />
        <rect x="5" y="10" width="3" height="4" rx="1.5" />
        <rect x="16" y="10" width="3" height="4" rx="1.5" />
      </>
    ),
    powerbank: (
      <>
        <rect x="7" y="5" width="10" height="14" rx="2" />
        <rect x="17" y="9" width="2" height="6" rx="0.5" />
      </>
    ),
    watch: (
      <>
        <rect x="8" y="6" width="8" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
    speaker: (
      <>
        <rect x="7" y="8" width="6" height="10" rx="3" />
        <rect x="13" y="10" width="4" height="6" rx="1" />
      </>
    ),
    cover: (
      <>
        <rect x="8" y="4" width="8" height="16" rx="2" />
        <circle cx="12" cy="17" r="1" />
      </>
    ),
    glass: (
      <>
        <rect x="8" y="4" width="8" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
    adapter: (
      <>
        <rect x="5" y="9" width="14" height="8" rx="1.5" />
        <rect x="8" y="6" width="3" height="3" rx="0.5" />
        <rect x="13" y="6" width="3" height="3" rx="0.5" />
      </>
    ),
    default: <circle cx="12" cy="12" r="7" />,
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {icons[type] || icons.default}
    </svg>
  );
}

function DesktopCategorySidebar({ categories, activeCategory }) {
  const allActive = !activeCategory;

  return (
    <aside className="hide-scrollbar h-full min-h-0 overflow-y-auto overscroll-y-contain border-r border-border-light bg-white py-4">
      <h2 className="px-5 pb-3 text-xs font-bold uppercase tracking-[0.12em] text-text-muted sm:text-sm">
        Categories
      </h2>
      <nav className="flex flex-col">
        <Link
          to="/product"
          className={`flex items-center gap-3 border-l-[3px] px-5 py-3 text-base transition ${
            allActive
              ? "border-primary bg-primary/10 font-semibold text-primary"
              : "border-transparent font-medium text-text-primary hover:bg-mobile-surface"
          }`}
        >
          <SidebarCategoryIcon type="grid" className="h-5 w-5 shrink-0" />
          All Categories
        </Link>
        {categories.map((cat, index) => {
          const isActive = activeCategory === cat.categoryName;
          const iconType = getCategoryIconType(cat.categoryName, index);
          return (
            <Link
              key={cat._id}
              to={`/product?categoryName=${encodeURIComponent(cat.categoryName)}`}
              className={`flex items-center gap-3 border-l-[3px] px-5 py-3 text-base transition ${
                isActive
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-transparent font-medium text-text-primary hover:bg-mobile-surface"
              }`}
            >
              <SidebarCategoryIcon
                type={iconType}
                className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-text-secondary"}`}
              />
              {cat.categoryName}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function DesktopProductToolbar({ title, backTo, onToggleSort }) {
  const navigate = useNavigate();

  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-border-light bg-white px-6 py-3">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="inline-flex shrink-0 items-center gap-1.5 text-text-primary"
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        <span className="text-xl font-bold leading-none">{title}</span>
      </button>

      <div className="ml-auto flex gap-3">
        <button
          type="button"
          className="flex min-w-[120px] items-center justify-center gap-2 rounded-md border border-border-light bg-white px-5 py-2.5 text-sm font-semibold text-text-primary"
        >
          <FilterIcon />
          Filter
        </button>
        <button
          type="button"
          onClick={onToggleSort}
          className="flex min-w-[120px] items-center justify-center gap-2 rounded-md border border-border-light bg-white px-5 py-2.5 text-sm font-semibold text-text-primary"
        >
          <SortIcon />
          Sort
        </button>
      </div>
    </div>
  );
}

function DesktopCategoryBar({ title, backTo }) {
  const navigate = useNavigate();

  return (
    <div className="border-b border-border-light bg-white px-6 py-4">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="inline-flex items-center gap-1.5 text-text-primary"
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        <span className="text-xl font-bold leading-none">{title}</span>
      </button>
    </div>
  );
}

function DesktopProductCard({ product, onAdd }) {
  const inStock = (product.stock ?? 0) > 0;
  const discount = product.discountedPercent ?? 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border-light bg-white">
      <Link
        to={`/product/${product._id}`}
        className="flex h-44 items-center justify-center bg-white px-4 py-3"
      >
        <div className="flex h-full w-full items-center justify-center">
          <ProductThumb src={product.productImages?.[0]} alt={product.name} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col border-t border-border-light p-4">
        <Link to={`/product/${product._id}`}>
          <h2 className="text-sm font-semibold leading-snug text-text-primary">{product.name}</h2>
        </Link>

        <p className="mt-2 text-xs text-text-muted line-through">{formatPrice(product.price)}</p>
        <p className="text-lg font-bold leading-tight text-primary">
          {formatPrice(product.discountedPrice ?? product.price)}
        </p>
        {discount > 0 && (
          <p className="mt-1 text-xs font-bold uppercase text-green-600">Save {discount}%</p>
        )}

        <p className={`mt-2 text-xs font-semibold ${inStock ? "text-green-600" : "text-red-500"}`}>
          {inStock ? "In Stock" : "Out of Stock"}
        </p>

        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={!inStock}
          className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </article>
  );
}

function DesktopProductGrid({
  products,
  categories,
  activeCategoryName,
  loading,
  pageTitle,
  backTo,
  emptyMessage = "No products found in this category yet.",
  sortBy,
  showSort,
  onToggleSort,
  onSortChange,
  onAdd,
}) {
  return (
    <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-[240px_1fr] bg-mobile-bg xl:grid-cols-[260px_1fr]">
        <DesktopCategorySidebar
          categories={categories}
          activeCategory={activeCategoryName}
        />

        <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-l border-border-light bg-white">
          <DesktopProductToolbar
            title={pageTitle}
            backTo={backTo}
            onToggleSort={onToggleSort}
          />

          {showSort && (
            <div className="border-b border-border-light px-6 py-2">
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

          <section className="bg-mobile-bg px-6 py-5">
            {loading ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[380px] animate-pulse rounded-lg border border-border-light bg-white"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <p className="py-12 text-center text-text-secondary">{emptyMessage}</p>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {products.map((product) => (
                  <DesktopProductCard key={product._id} product={product} onAdd={onAdd} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DesktopCategoriesPage({ categories, loading }) {
  return (
    <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-[240px_1fr] bg-mobile-bg xl:grid-cols-[260px_1fr]">
        <DesktopCategorySidebar categories={categories} activeCategory="" />

        <div className="flex min-h-0 flex-col overflow-hidden border-l border-border-light bg-white">
          <DesktopCategoryBar title="All Categories" backTo="/" />

          <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-mobile-bg px-6 py-6">
            <p className="mb-5 text-sm text-text-secondary">
              Select a category from the sidebar to browse products.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {loading
                ? [...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-lg border border-border-light bg-white"
                    />
                  ))
                : categories.map((item) => (
                    <Link
                      key={item._id}
                      to={`/product?categoryName=${encodeURIComponent(item.categoryName)}`}
                      className="block rounded-lg border border-border-light bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <h2 className="font-bold text-text-primary">{item.categoryName}</h2>
                      {item.subcategories?.length > 0 && (
                        <p className="mt-1 text-sm text-text-secondary">
                          {item.subcategories.slice(0, 3).join(" · ")}
                        </p>
                      )}
                    </Link>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Product() {
  const [searchParams] = useSearchParams();
  const categoryName = searchParams.get("categoryName")?.trim() || "";
  const subcategory = searchParams.get("subcategory")?.trim() || "";
  const searchQuery = searchParams.get("q")?.trim() || "";

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("default");
  const [showSort, setShowSort] = useState(false);

  const { addToCart } = useCart();
  const { openAuthModal } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (categoryName) params.categoryName = categoryName;
        if (subcategory) params.subcategory = subcategory;
        if (searchQuery) params.q = searchQuery;

        const requests = [getCategories()];
        if (categoryName || searchQuery) {
          requests.push(getProducts(params));
        }

        const [categoriesRes, productsRes] = await Promise.all(requests);

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
  }, [categoryName, subcategory, searchQuery]);

  const pageTitle = searchQuery
    ? `Results for "${searchQuery}"`
    : subcategory || categoryName || "Our Products";

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.discountedPrice - b.discountedPrice);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.discountedPrice - a.discountedPrice);
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [products, sortBy]);

  const handleAdd = async (product) => {
    if (!product._id) return;
    const result = await addToCart(product, 1);
    if (result?.requiresLogin) {
      openAuthModal("login");
    }
  };

  const showProductResults = Boolean(categoryName || searchQuery);
  const mobileBackTo = searchQuery
    ? categoryName
      ? subcategory
        ? `/product?categoryName=${encodeURIComponent(categoryName)}`
        : `/product?categoryName=${encodeURIComponent(categoryName)}`
      : "/product"
    : subcategory
      ? `/product?categoryName=${encodeURIComponent(categoryName)}`
      : "/";
  const desktopBackTo = searchQuery
    ? categoryName
      ? `/product?categoryName=${encodeURIComponent(categoryName)}`
      : "/product"
    : subcategory
      ? `/product?categoryName=${encodeURIComponent(categoryName)}`
      : "/product";

  if (showProductResults) {
    return (
      <div className="min-h-screen bg-mobile-bg pb-6 lg:flex lg:h-[calc(100vh-72px-2rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-0">
        <div className="lg:hidden">
          <MobileProductToolbar
            title={pageTitle}
            backTo={mobileBackTo}
            onToggleSort={() => setShowSort((prev) => !prev)}
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
                  onClick={() => {
                    setSortBy(option.id);
                    setShowSort(false);
                  }}
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

          <div className="space-y-2.5 bg-mobile-bg px-4 py-3">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[100px] animate-pulse rounded-xl border border-border-light bg-white"
                />
              ))
            ) : sortedProducts.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-secondary">
                {searchQuery
                  ? `No products found for "${searchQuery}".`
                  : "No products found in this category yet."}
              </p>
            ) : (
              sortedProducts.map((product) => (
                <MobileProductCard key={product._id} product={product} onAdd={handleAdd} />
              ))
            )}
          </div>
        </div>

        <DesktopProductGrid
          products={sortedProducts}
          categories={categories}
          activeCategoryName={categoryName}
          loading={loading}
          pageTitle={pageTitle}
          backTo={desktopBackTo}
          emptyMessage={
            searchQuery
              ? `No products found for "${searchQuery}".`
              : "No products found in this category yet."
          }
          sortBy={sortBy}
          showSort={showSort}
          onToggleSort={() => setShowSort((prev) => !prev)}
          onSortChange={(id) => {
            setSortBy(id);
            setShowSort(false);
          }}
          onAdd={handleAdd}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mobile-bg pb-6 lg:flex lg:h-[calc(100vh-72px-2rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-0">
      <MobileProductToolbar title="Our Products" backTo="/" showActions={false} />

      <section className="px-4 py-4 lg:hidden">
        <div className="space-y-3">
          {loading
            ? [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl border border-border-light bg-white"
                />
              ))
            : categories.map((item) => (
                <Link
                  key={item._id}
                  to={`/product?categoryName=${encodeURIComponent(item.categoryName)}`}
                  className="flex items-center justify-between rounded-xl border border-border-light bg-white px-4 py-4 shadow-sm"
                >
                  <div>
                    <h2 className="text-base font-bold text-text-primary">{item.categoryName}</h2>
                    {item.subcategories?.length > 0 && (
                      <p className="mt-1 line-clamp-1 text-xs text-text-secondary">
                        {item.subcategories.slice(0, 3).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="text-xl text-text-secondary">›</span>
                </Link>
              ))}
        </div>
      </section>

      <DesktopCategoriesPage categories={categories} loading={loading} />
    </div>
  );
}

export default Product;
