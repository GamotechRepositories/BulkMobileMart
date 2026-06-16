import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import DealProductCard from "../components/product/DealProductCard";
import {
  getAvailableColors,
  isMultiVariant,
  isProductInStock,
} from "../utils/productPricing";

function Wishlist() {
  const { user, openAuthModal } = useAuth();
  const { items: wishlistItems, loading, loadWishlist } = useWishlist();
  const { items: cartItems, addToCart, updateQuantity, removeFromCart } = useCart();

  const resolveCartDefaults = (product) => {
    let variantName = "";
    if (isMultiVariant(product)) {
      const firstInStockVariant = product.variants.find((variant) =>
        isProductInStock(product, variant.name)
      );
      variantName = firstInStockVariant?.name || product.variants?.[0]?.name || "";
    }

    const availableColors = getAvailableColors(product, variantName);
    const colorName = availableColors[0]?.name || "";

    return { variantName, colorName };
  };

  useEffect(() => {
    if (user) loadWishlist();
  }, [user, loadWishlist]);

  const handleAdd = async (product) => {
    if (!product._id || product._id.length < 10) return;
    const { variantName, colorName } = resolveCartDefaults(product);
    const result = await addToCart(product, 1, {
      variantName,
      colorName,
    });
    if (result?.requiresLogin) {
      openAuthModal("login");
    }
  };

  const getCartLine = (product) => {
    if (!product?._id) return null;
    const { variantName, colorName } = resolveCartDefaults(product);
    return (
      cartItems.find(
        (item) =>
          item._id === product._id &&
          (item.variantName || "") === variantName &&
          (item.colorName || "") === colorName
      ) || null
    );
  };

  const getCartQuantity = (product) => getCartLine(product)?.quantity || 0;

  const handleIncrease = async (product) => {
    if (!product._id || product._id.length < 10) return;
    const { variantName, colorName } = resolveCartDefaults(product);
    const result = await addToCart(product, 1, {
      variantName,
      colorName,
    });
    if (result?.requiresLogin) {
      openAuthModal("login");
    }
  };

  const handleDecrease = async (product) => {
    const line = getCartLine(product);
    if (!line) return;
    if (line.quantity <= 1) {
      await removeFromCart(line._id, line.variantName || "", line.colorName || "");
      return;
    }
    await updateQuantity(
      line._id,
      line.quantity - 1,
      line.variantName || "",
      line.colorName || ""
    );
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-mobile-bg px-4 py-16 text-text-primary sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-3 text-2xl font-bold sm:text-3xl">My Wishlist</h1>
          <p className="mb-6 text-text-secondary">
            Please login to save and view your favourite products.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="rounded-lg bg-primary px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-110"
          >
            Login / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mobile-bg text-text-primary">
      <section className="bg-white px-4 py-4 pb-6 sm:px-6 md:px-8 md:pb-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl lg:text-3xl">
            My Wishlist
          </h1>

          {loading ? (
            <>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 md:hidden">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-[220px] w-[150px] shrink-0 animate-pulse rounded-xl border border-border-light bg-white sm:w-[165px]"
                  />
                ))}
              </div>
              <div className="hidden grid-cols-4 gap-4 md:grid lg:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-[280px] animate-pulse rounded-xl border border-border-light bg-white"
                  />
                ))}
              </div>
            </>
          ) : wishlistItems.length === 0 ? (
            <div className="rounded-xl border border-border-light bg-white py-16 text-center shadow-sm">
              <p className="mb-2 text-lg font-semibold">Your wishlist is empty</p>
              <p className="mb-6 text-sm text-text-secondary">
                Tap the heart on any product to save it here.
              </p>
              <Link
                to="/product"
                className="inline-block rounded-lg bg-primary px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-110"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 md:hidden">
                {wishlistItems.map((item) => (
                  <DealProductCard
                    key={item._id}
                    product={item}
                    onAdd={handleAdd}
                    onIncrease={handleIncrease}
                    onDecrease={handleDecrease}
                    cartQuantity={getCartQuantity(item)}
                    layout="scroll"
                    addDisabled={loading}
                  />
                ))}
              </div>

              <div className="hidden grid-cols-4 gap-4 md:grid lg:grid-cols-6">
                {wishlistItems.map((item) => (
                  <DealProductCard
                    key={item._id}
                    product={item}
                    onAdd={handleAdd}
                    onIncrease={handleIncrease}
                    onDecrease={handleDecrease}
                    cartQuantity={getCartQuantity(item)}
                    layout="grid"
                    addDisabled={loading}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Wishlist;
