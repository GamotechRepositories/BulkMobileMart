import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getProducts } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

const PAGE_LINKS = [
  { to: "/wishlist", label: "Wishlist" },
  { to: "/about", label: "About" },
  { to: "/support", label: "Support" },
  { to: "/contact", label: "Contact" },
  { to: "/orders", label: "My Orders" },
  { to: "/profile", label: "Profile" },
];

function categoryUrl(name, params = {}) {
  const search = new URLSearchParams();
  if (name) search.set("categoryName", name);
  if (params.subcategory) search.set("subcategory", params.subcategory);
  if (params.brand) search.set("brand", params.brand);
  if (params.minPrice) search.set("minPrice", params.minPrice);
  if (params.maxPrice) search.set("maxPrice", params.maxPrice);
  const qs = search.toString();
  return qs ? `/product?${qs}` : "/product";
}

function MobileDrawerFilters({ categories, open }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  const categoryName = searchParams.get("categoryName")?.trim() || "";
  const subcategory = searchParams.get("subcategory")?.trim() || "";
  const selectedBrand = searchParams.get("brand")?.trim() || "";
  const minPrice = searchParams.get("minPrice")?.trim() || "";
  const maxPrice = searchParams.get("maxPrice")?.trim() || "";

  const activeCategory = categories.find(
    (cat) => cat.categoryName.toLowerCase() === categoryName.toLowerCase()
  );
  const subcategories = activeCategory?.subcategories || [];
  const pills = ["All", ...subcategories];

  const preservedFilters = { brand: selectedBrand, minPrice, maxPrice };

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoadingBrands(true);

    (async () => {
      try {
        const params = {};
        if (categoryName) params.categoryName = categoryName;
        const { data } = await getProducts(params);
        if (active) setProducts(data.data || []);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoadingBrands(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, categoryName]);

  const brands = [...new Set(products.map((p) => p.brandName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (categoryName) next.set("categoryName", categoryName);
    if (subcategory) next.set("subcategory", subcategory);
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = Boolean(selectedBrand || minPrice || maxPrice);

  return (
    <div className="mb-4 border-b border-border-light pb-4">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Filters
      </p>

      {categoryName && subcategories.length > 0 ? (
        <div className="mb-3 px-2">
          <p className="mb-1.5 text-[10px] lowercase text-text-secondary">subcategory</p>
          <div className="flex flex-wrap gap-1.5">
            {pills.map((pill) => {
              const isAll = pill === "All";
              const isActive = isAll ? !subcategory : subcategory === pill;
              const to = isAll
                ? categoryUrl(categoryName, preservedFilters)
                : categoryUrl(categoryName, { ...preservedFilters, subcategory: pill });

              return (
                <Link
                  key={pill}
                  to={to}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    isActive
                      ? "border-primary bg-primary text-white"
                      : "border-border-light bg-white text-text-primary"
                  }`}
                >
                  {pill}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2 px-2">
        <div>
          <label className="mb-1 block text-[10px] lowercase text-text-secondary">brand name</label>
          <select
            value={selectedBrand}
            onChange={(e) => updateParam("brand", e.target.value)}
            disabled={loadingBrands}
            className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-text-primary"
          >
            <option value="">all brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] lowercase text-text-secondary">min</label>
            <input
              type="number"
              min={0}
              placeholder="min"
              value={minPrice}
              onChange={(e) => updateParam("minPrice", e.target.value)}
              className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm lowercase placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] lowercase text-text-secondary">max</label>
            <input
              type="number"
              min={0}
              placeholder="max"
              value={maxPrice}
              onChange={(e) => updateParam("maxPrice", e.target.value)}
              className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm lowercase placeholder:text-text-muted"
            />
          </div>
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="w-full rounded-lg border border-border-light py-2 text-xs font-semibold text-text-secondary"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MobileMenuDrawer({ open, onClose, categories }) {
  const { pathname } = useLocation();
  const { user, openAuthModal } = useAuth();
  const isProductPage = pathname === "/product";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleWishlistClick = (e) => {
    if (!user) {
      e.preventDefault();
      onClose();
      openAuthModal("login");
    } else {
      onClose();
    }
  };

  const handleGuestLink = (e, requiresAuth) => {
    if (requiresAuth && !user) {
      e.preventDefault();
      onClose();
      openAuthModal("login");
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close menu"
      />

      <aside className="absolute right-0 top-0 flex h-full w-[min(300px,88vw)] flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border-light px-4 py-4">
          <div className="min-w-0">
            {user ? (
              <>
                <p className="truncate text-base font-bold text-text-primary">{user.name}</p>
                <p className="truncate text-xs text-text-secondary">{user.email}</p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal("login");
                }}
                className="text-left text-base font-bold text-primary"
              >
                Login / Register
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-mobile-surface"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="hide-scrollbar flex-1 overflow-y-auto px-3 py-3">
          {isProductPage ? (
            <MobileDrawerFilters categories={categories} open={open} />
          ) : null}

          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Pages
          </p>
          <ul className="mb-4 space-y-0.5">
            {PAGE_LINKS.map((item) => {
              const needsAuth =
                item.to === "/wishlist" || item.to === "/orders" || item.to === "/profile";
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={(e) =>
                      item.to === "/wishlist"
                        ? handleWishlistClick(e)
                        : handleGuestLink(e, needsAuth)
                    }
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary transition hover:bg-mobile-surface"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Categories
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link
                to="/product"
                onClick={onClose}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary transition hover:bg-mobile-surface"
              >
                All Products
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat._id}>
                <Link
                  to={categoryUrl(cat.categoryName)}
                  onClick={onClose}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary transition hover:bg-mobile-surface"
                >
                  {cat.categoryName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

export default MobileMenuDrawer;
