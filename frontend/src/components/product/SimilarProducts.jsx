import { useEffect, useState } from "react";
import { getSimilarProducts } from "../../api/api";
import { useProductCartActions } from "../../hooks/useProductCartActions";
import SectionHeader from "../mobile/SectionHeader";
import DealProductCard from "./DealProductCard";

function SimilarProducts({ productId, categoryName = "" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getCartQuantity, handleAdd, handleIncrease, handleDecrease } =
    useProductCartActions();

  useEffect(() => {
    if (!productId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const { data } = await getSimilarProducts(productId);
        if (!cancelled) {
          setProducts(data.data || []);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSimilar();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const viewAllTo = categoryName
    ? `/product?categoryName=${encodeURIComponent(categoryName)}`
    : "/product";

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="col-span-6 mt-8 border-t border-border-light pt-6">
      <SectionHeader title="Similar Products" viewAllTo={viewAllTo} className="mb-4" />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={`similar-skeleton-${index}`}
              className="col-span-1 h-[260px] animate-pulse rounded-xl border border-border-light bg-mobile-surface"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 [&>div]:col-span-1 [&>div]:h-full">
          {products.map((product) => (
            <DealProductCard
              key={product._id}
              product={product}
              onAdd={handleAdd}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              cartQuantity={getCartQuantity(product)}
              layout="grid"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default SimilarProducts;
