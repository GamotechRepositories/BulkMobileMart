import { useEffect, useState } from "react";
import { getProducts } from "../../api/api";
import HomeProductRow from "./HomeProductRow";

const HOME_PRODUCT_LIMIT = 12;

function HotSelling() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await getProducts({
          hotSelling: true,
          limit: HOME_PRODUCT_LIMIT,
        });
        setProducts((data.data || []).slice(0, HOME_PRODUCT_LIMIT));
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
      title="Hot Selling Products"
      viewAllTo="/hot-selling"
      products={products}
      loading={loading}
    />
  );
}

export default HotSelling;
