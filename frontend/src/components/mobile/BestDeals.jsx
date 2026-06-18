import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  getCartStepForProduct,
  getDecreasedCartQuantity,
  resolveCartDefaults,
} from "../../utils/cartDefaults";
import SectionHeader from "./SectionHeader";
import DealProductCard from "../product/DealProductCard";

const HOME_PRODUCT_LIMIT = 12;
const MOBILE_ITEMS_PER_SLIDE = 4;

const FALLBACK_PRODUCTS = [
  { _id: "1", name: "Fast Charger", sub: "20W", price: 165, discountedPrice: 165 },
  { _id: "2", name: "Bass Edition", sub: "Neckband", price: 299, discountedPrice: 299 },
  { _id: "3", name: "Type-C Cable", sub: "1M", price: 89, discountedPrice: 89 },
  { _id: "4", name: "Power Bank", sub: "10000mAh", price: 799, discountedPrice: 799 },
  { _id: "5", name: "Earbuds Pro", sub: "Wireless", price: 499, discountedPrice: 499 },
  { _id: "6", name: "Car Charger", sub: "Dual Port", price: 249, discountedPrice: 249 },
  { _id: "7", name: "Data Cable", sub: "3A Fast", price: 129, discountedPrice: 129 },
  { _id: "8", name: "Neckband Pro", sub: "BT 5.0", price: 349, discountedPrice: 349 },
  { _id: "9", name: "Wall Adapter", sub: "18W", price: 199, discountedPrice: 199 },
  { _id: "10", name: "Tempered Glass", sub: "9H", price: 99, discountedPrice: 99 },
  { _id: "11", name: "BT Speaker", sub: "Mini", price: 599, discountedPrice: 599 },
  { _id: "12", name: "Mobile Cover", sub: "Silicone", price: 149, discountedPrice: 149 },
];

function chunkProducts(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function BestDeals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { items, addToCart, updateQuantity, removeFromCart } = useCart();
  const { openAuthModal } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await getProducts({ limit: HOME_PRODUCT_LIMIT });
        const list = (data.data || []).slice(0, HOME_PRODUCT_LIMIT);
        setProducts(list.length > 0 ? list : FALLBACK_PRODUCTS);
      } catch {
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAdd = async (product, flySource) => {
    if (!product._id || product._id.length < 10) return;
    const { variantName, colorName, quantity } = resolveCartDefaults(product);
    const result = await addToCart(product, quantity, {
      variantName,
      colorName,
      flySource,
    });
    if (result?.requiresLogin) {
      openAuthModal("login");
    }
  };

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
    if (!product._id || product._id.length < 10) return;
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

  const displayProducts = (loading ? FALLBACK_PRODUCTS : products).slice(0, HOME_PRODUCT_LIMIT);
  const mobileBatches = useMemo(
    () => chunkProducts(displayProducts, MOBILE_ITEMS_PER_SLIDE),
    [displayProducts]
  );

  const cardProps = (product) => ({
    product,
    onAdd: handleAdd,
    onIncrease: handleIncrease,
    onDecrease: handleDecrease,
    cartQuantity: getCartQuantity(product),
    layout: "grid",
  });

  return (
    <section className="bg-white px-4 sm:px-6 md:px-8">
      <SectionHeader title="Best Prices Unbeatable Deals" viewAllTo="/product" className="mb-2" />

      <div className="md:hidden">
        <div className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1">
          {mobileBatches.map((batch, batchIndex) => (
            <div
              key={`deals-batch-${batchIndex}`}
              className="w-full shrink-0 snap-start"
            >
              <div className="grid grid-cols-2 grid-rows-2 gap-2.5">
                {batch.map((product) => (
                  <DealProductCard key={product._id} {...cardProps(product)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-4 gap-4 md:grid lg:grid-cols-6">
        {displayProducts.map((product) => (
          <DealProductCard key={`desktop-${product._id}`} {...cardProps(product)} />
        ))}
      </div>
    </section>
  );
}

export default BestDeals;
