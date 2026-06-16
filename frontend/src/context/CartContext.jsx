import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { addToCartItem, getCart, removeFromCartItem, updateCartItemQty } from "../api/api";
import { useAuth } from "./AuthContext";
import AddedToCartToast from "../components/cart/AddedToCartToast";
import { getUnitPriceForQuantity, getVariantStock } from "../utils/productPricing";

const CartContext = createContext(null);
const TOAST_DURATION_MS = 2600;

const mapCartItems = (cart) => {
  if (!cart?.items?.length) return [];

  return cart.items
    .filter((item) => item.product && item.product.isActive !== false)
    .map((item) => {
      const unitPrice = getUnitPriceForQuantity(
        item.product,
        item.quantity,
        item.variantName || ""
      );

      return {
        _id: item.product._id,
        variantName: item.variantName || "",
        colorName: item.colorName || "",
        name: item.product.name,
        brandName: item.product.brandName,
        price: item.product.price,
        discountedPrice: unitPrice,
        pricingType: item.product.pricingType,
        bulkPricing: item.product.bulkPricing,
        variantType: item.product.variantType,
        variants: item.product.variants,
        productImages: item.product.productImages,
        stock: getVariantStock(item.product, item.variantName || ""),
        quantity: item.quantity,
      };
    });
};

export function CartProvider({ children }) {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cartToast, setCartToast] = useState(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const pendingAddRef = useRef(null);
  const toastTimerRef = useRef(null);
  const toastExitTimerRef = useRef(null);

  const dismissCartToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (toastExitTimerRef.current) {
      clearTimeout(toastExitTimerRef.current);
      toastExitTimerRef.current = null;
    }

    setToastLeaving(true);
    toastExitTimerRef.current = setTimeout(() => {
      setCartToast(null);
      setToastLeaving(false);
    }, 250);
  }, []);

  const showAddedToCartToast = useCallback(
    (product) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);

      setToastLeaving(false);
      setCartToast({
        productImage: product?.productImages?.[0] || "",
      });

      toastTimerRef.current = setTimeout(() => {
        dismissCartToast();
      }, TOAST_DURATION_MS);
    },
    [dismissCartToast]
  );

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);
    },
    []
  );

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
          variantName: options.variantName || "",
          colorName: options.colorName || "",
        };
        openAuthModal("login");
        return { requiresLogin: true };
      }

      try {
        const { data } = await addToCartItem({
          productId: product._id,
          quantity: qty,
          variantName: options.variantName || "",
          colorName: options.colorName || "",
        });
        setItems(mapCartItems(data.data));
        showAddedToCartToast(product);
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    [user, openAuthModal, showAddedToCartToast]
  );

  useEffect(() => {
    if (!user || !pendingAddRef.current) return;

    const pending = pendingAddRef.current;
    pendingAddRef.current = null;

    addToCart(pending.product, pending.quantity, {
      variantName: pending.variantName,
      colorName: pending.colorName,
    });
  }, [user, addToCart]);

  const removeFromCart = useCallback(
    async (productId, variantName = "", colorName = "") => {
      if (!user) return;

      try {
        const { data } = await removeFromCartItem(productId, variantName, colorName);
        setItems(mapCartItems(data.data));
      } catch {
        /* keep current items on error */
      }
    },
    [user]
  );

  const updateQuantity = useCallback(
    async (productId, quantity, variantName = "", colorName = "") => {
      if (!user) return;

      try {
        const { data } = await updateCartItemQty(
          productId,
          quantity,
          variantName,
          colorName
        );
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
      <AddedToCartToast
        visible={Boolean(cartToast)}
        productImage={cartToast?.productImage}
        leaving={toastLeaving}
      />
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
