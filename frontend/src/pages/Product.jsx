import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import CategoryProductLayout, {
  AllProductsLayout,
  DesktopCategorySidebar,
  MobileCategoryProductLayout,
} from "../components/product/CategoryProductLayout";
import AddToCartButton from "../components/product/AddToCartButton";
import ProductPriceDisplay from "../components/product/ProductPriceDisplay";
import WishlistButton from "../components/product/WishlistButton";
import ProductThumb from "../components/product/ProductThumb";
import { isProductInStock } from "../utils/productPricing";
import {
  getCartStepForProduct,
  getDecreasedCartQuantity,
  resolveCartDefaults,
} from "../utils/cartDefaults";

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

function MobileProductCard({ product, cartQuantity, onIncrease, onDecrease }) {
  const inStock = isProductInStock(product);

  return (
    <article className="flex items-center gap-2.5 rounded-xl border border-border-light bg-white p-2.5">
      <div className="relative shrink-0">
        <div className="absolute right-1 top-1 z-10">
          <WishlistButton product={product} />
        </div>
        <Link
          to={`/product/${product._id}`}
          className="block w-[84px] shrink-0 overflow-hidden rounded-lg border border-border-light"
        >
          <ProductThumb src={product.productImages?.[0]} alt={product.name} />
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/product/${product._id}`} className="min-w-0">
          <h2 className="line-clamp-1 text-base font-bold leading-tight text-text-primary">
            {product.name}
          </h2>
        </Link>

        <ProductPriceDisplay product={product} size="md" className="mt-0.5" />

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${inStock ? "text-green-600" : "text-red-500"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </p>
          {cartQuantity > 0 ? (
            <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-border-light bg-white">
              <button
                type="button"
                onClick={() => onDecrease(product)}
                className="flex h-8 w-8 items-center justify-center text-base text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="flex h-8 min-w-[2rem] items-center justify-center border-x border-border-light px-1 text-sm font-bold text-text-primary">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={() => onIncrease(product)}
                disabled={!inStock}
                className="flex h-8 w-8 items-center justify-center text-base text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <AddToCartButton
              onClick={(e) => onIncrease(product, e.currentTarget)}
              disabled={!inStock}
              className="shrink-0"
            />
          )}
        </div>
      </div>
    </article>
  );
}

function SearchResultsView({
  products,
  categories,
  loading,
  searchQuery,
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

  const pageTitle = `Results for "${searchQuery}"`;
  const emptyMessage = `No products found for "${searchQuery}".`;

  return (
    <div className="min-h-screen bg-mobile-bg pb-6 lg:flex lg:h-[calc(100vh-108px)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-0">
      <div className="lg:hidden">
        <MobileProductToolbar
          title={pageTitle}
          backTo="/product"
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
        <div className="space-y-2.5 bg-mobile-bg px-0 py-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[100px] animate-pulse rounded-xl border border-border-light bg-white"
              />
            ))
          ) : sortedProducts.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-secondary">{emptyMessage}</p>
          ) : (
            sortedProducts.map((product) => (
              <MobileProductCard
                key={product._id}
                product={product}
                cartQuantity={onGetCartQuantity(product)}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
              />
            ))
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-[240px_1fr] bg-mobile-bg xl:grid-cols-[260px_1fr]">
          <DesktopCategorySidebar categories={categories} activeCategory="" />
          <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto border-l border-border-light bg-white px-6 py-5">
            <h1 className="mb-4 text-xl font-bold text-text-primary">{pageTitle}</h1>
            {loading ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[380px] animate-pulse rounded-lg border border-border-light bg-white"
                  />
                ))}
              </div>
            ) : sortedProducts.length === 0 ? (
              <p className="py-12 text-center text-text-secondary">{emptyMessage}</p>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {sortedProducts.map((product) => (
                  <MobileProductCard
                    key={product._id}
                    product={product}
                    cartQuantity={onGetCartQuantity(product)}
                    onIncrease={onIncrease}
                    onDecrease={onDecrease}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Product() {
  const [searchParams] = useSearchParams();
  const categoryName = searchParams.get("categoryName")?.trim() || "";
  const searchQuery = searchParams.get("q")?.trim() || "";

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("default");
  const [showSort, setShowSort] = useState(false);

  const { items, addToCart, updateQuantity, removeFromCart } = useCart();
  const { openAuthModal } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (categoryName) params.categoryName = categoryName;
        if (searchQuery) params.q = searchQuery;

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
  }, [categoryName, searchQuery]);

  const getCartLine = (product) => {
    if (!product?._id) return null;
    const { variantName, colorName } = resolveCartDefaults(product);
    return (
      items.find(
        (item) =>
          item._id === product._id &&
          (item.variantName || "") === variantName &&
          (item.colorName || "") === colorName
      ) || null
    );
  };

  const getCartQuantity = (product) => getCartLine(product)?.quantity || 0;

  const handleIncrease = async (product, flySource) => {
    if (!product._id) return;
    const { variantName, colorName, quantity } = resolveCartDefaults(product);
    const step = getCartStepForProduct(product, variantName);
    const line = getCartLine(product);
    const addQty = line ? step : quantity;
    const result = await addToCart(product, addQty, {
      variantName,
      colorName,
      flySource: line ? undefined : flySource,
    });
    if (result?.requiresLogin) {
      openAuthModal("login");
    }
  };

  const handleDecrease = async (product) => {
    const line = getCartLine(product);
    if (!line) return;
    const step = getCartStepForProduct(product, line.variantName || "");
    const nextQty = getDecreasedCartQuantity(line.quantity, step);
    if (nextQty <= 0) {
      await removeFromCart(line._id, line.variantName || "", line.colorName || "");
      return;
    }
    await updateQuantity(
      line._id,
      nextQty,
      line.variantName || "",
      line.colorName || ""
    );
  };

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
