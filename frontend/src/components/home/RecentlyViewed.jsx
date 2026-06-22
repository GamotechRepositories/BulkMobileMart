import { useEffect, useState } from "react";
import { getProducts } from "../../api/api";
import { getRecentlyViewedIds } from "../../utils/recentlyViewed";
import HomeProductRow from "./HomeProductRow";

const HOME_PRODUCT_LIMIT = 12;

function RecentlyViewed() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const ids = getRecentlyViewedIds().slice(0, HOME_PRODUCT_LIMIT);

      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        const { data } = await getProducts({
          ids: ids.join(","),
          limit: HOME_PRODUCT_LIMIT,
        });
        const fetched = data.data || [];
        const byId = new Map(fetched.map((product) => [String(product._id), product]));
        const ordered = ids
          .map((id) => byId.get(String(id)))
          .filter(Boolean)
          .slice(0, HOME_PRODUCT_LIMIT);

        setProducts(ordered);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <HomeProductRow
      title="Recently Viewed"
      viewAllTo="/product"
      products={products}
      loading={loading}
    />
  );
}

export default RecentlyViewed;
