import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import SectionHeader from "./SectionHeader";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const FALLBACK_PRODUCTS = [
  { _id: "1", name: "Fast Charger", sub: "20W", price: 165 },
  { _id: "2", name: "Bass Edition", sub: "Neckband", price: 299 },
  { _id: "3", name: "Type-C Cable", sub: "1M", price: 89 },
  { _id: "4", name: "Power Bank", sub: "10000mAh", price: 799 },
  { _id: "5", name: "Earbuds Pro", sub: "Wireless", price: 499 },
  { _id: "6", name: "Car Charger", sub: "Dual Port", price: 249 },
];

function ProductCard({ product, onAdd }) {
  const image = product.productImages?.[0];
  const subtitle =
    product.subcategory ||
    product.features?.[0] ||
    product.brandName ||
    product.sub;

  return (
    <div className="flex w-[150px] shrink-0 flex-col rounded-xl border border-border-light bg-white p-3 shadow-sm transition hover:shadow-md sm:w-[165px] md:w-auto">
      <Link to={product._id?.length > 10 ? `/product/${product._id}` : "/product"}>
        <div className="flex h-[100px] items-center justify-center overflow-hidden rounded-lg bg-mobile-surface sm:h-[110px] md:h-[130px] lg:h-[150px]">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-contain p-2"
              loading="lazy"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-white shadow-inner" />
          )}
        </div>
        <h3 className="mt-2 line-clamp-1 text-sm font-bold text-text-primary sm:text-base">
          {product.name}
        </h3>
        <p className="line-clamp-1 text-[11px] text-text-secondary sm:text-xs">
          {subtitle}
        </p>
        <p className="mt-1 text-sm font-bold text-primary sm:text-base">
          {formatPrice(product.discountedPrice ?? product.price)}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => onAdd(product)}
        className="mt-2 w-full rounded-lg bg-primary py-1.5 text-xs font-bold text-white transition hover:brightness-110 sm:py-2 sm:text-sm"
      >
        ADD
      </button>
    </div>
  );
}

function BestDeals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { openAuthModal } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await getProducts({ limit: 12 });
        const list = data.data || [];
        setProducts(list.length > 0 ? list : FALLBACK_PRODUCTS);
      } catch {
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAdd = async (product) => {
    if (!product._id || product._id.length < 10) return;
    const result = await addToCart(product, 1);
    if (result?.requiresLogin) {
      openAuthModal("login");
    }
  };

  const displayProducts = loading ? FALLBACK_PRODUCTS : products;

  return (
    <section className="bg-white px-4 py-4 pb-6 sm:px-6 md:px-8 md:pb-8">
      <SectionHeader title="Best Prices Unbeatable Deals" viewAllTo="/product" />
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-4 xl:grid-cols-6">
        {displayProducts.map((product) => (
          <ProductCard key={product._id} product={product} onAdd={handleAdd} />
        ))}
      </div>
    </section>
  );
}

export default BestDeals;
