import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { addToCartItem, getCart, removeFromCartItem, updateCartItemQty } from "../api/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

const mapCartItems = (cart) => {
  if (!cart?.items?.length) return [];

  return cart.items
    .filter((item) => item.product)
    .map((item) => ({
      _id: item.product._id,
      name: item.product.name,
      brandName: item.product.brandName,
      price: item.product.price,
      discountedPrice: item.product.discountedPrice,
      productImages: item.product.productImages,
      stock: item.product.stock ?? 0,
      quantity: item.quantity,
    }));
};

export function CartProvider({ children }) {
  const navigate = useNavigate();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const pendingAddRef = useRef(null);

  const loadCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await getCart();
      setItems(mapCartItems(data.data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      loadCart();
    } else {
      setItems([]);
    }
  }, [user, authLoading, loadCart]);

  const addToCart = useCallback(
    async (product, quantity, options = {}) => {
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        return { success: false };
      }

      if (!user) {
        pendingAddRef.current = {
          product,
          quantity: qty,
          buyNow: Boolean(options.buyNow),
        };
        openAuthModal("login");
        return { requiresLogin: true };
      }

      try {
        const { data } = await addToCartItem({
          productId: product._id,
          quantity: qty,
        });
        setItems(mapCartItems(data.data));
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    [user, openAuthModal]
  );

  useEffect(() => {
    if (!user || !pendingAddRef.current) return;

    const pending = pendingAddRef.current;
    pendingAddRef.current = null;

    addToCart(pending.product, pending.quantity).then((result) => {
      if (result?.success && pending.buyNow) {
        navigate("/checkout");
      }
    });
  }, [user, addToCart, navigate]);

  const removeFromCart = useCallback(
    async (productId) => {
      if (!user) return;

      try {
        const { data } = await removeFromCartItem(productId);
        setItems(mapCartItems(data.data));
      } catch {
        /* keep current items on error */
      }
    },
    [user]
  );

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      if (!user) return;

      try {
        const { data } = await updateCartItemQty(productId, quantity);
        setItems(mapCartItems(data.data));
      } catch {
        /* keep current items on error */
      }
    },
    [user]
  );

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        cartCount,
        loadCart,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
