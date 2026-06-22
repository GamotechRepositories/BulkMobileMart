import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  getCartStepForItem,
  getDecreasedCartQuantityForProduct,
  resolveCartDefaults,
} from "../utils/cartDefaults";

function findCartLine(items, product) {
  if (!product?._id) return null;

  const { variantName, colorName } = resolveCartDefaults(product);
  const exact =
    items.find(
      (item) =>
        item._id === product._id &&
        (item.variantName || "") === variantName &&
        (item.colorName || "") === colorName
    ) || null;

  if (exact) return exact;

  return items.find((item) => item._id === product._id) || null;
}

export function useProductCartActions() {
  const { openAuthModal } = useAuth();
  const { items, addToCart, updateQuantity, removeFromCart } = useCart();

  const getCartLine = useCallback((product) => findCartLine(items, product), [items]);

  const getCartQuantity = useCallback(
    (product) => getCartLine(product)?.quantity || 0,
    [getCartLine]
  );

  const handleAdd = useCallback(
    async (product, flySource) => {
      if (!product?._id || product._id.length < 10) return null;

      const { variantName, colorName, quantity } = resolveCartDefaults(product);
      const result = await addToCart(product, quantity, {
        variantName,
        colorName,
        flySource,
      });

      if (result?.requiresLogin) {
        openAuthModal("login");
      }

      return result;
    },
    [addToCart, openAuthModal]
  );

  const handleIncrease = useCallback(
    async (product, flySource) => {
      if (!product?._id || product._id.length < 10) return null;

      const line = getCartLine(product);
      const { variantName, colorName, quantity } = resolveCartDefaults(product);

      if (line) {
        const step = getCartStepForItem(line);
        await updateQuantity(
          line._id,
          line.quantity + step,
          line.variantName || "",
          line.colorName || ""
        );
        return { success: true };
      }

      const result = await addToCart(product, quantity, {
        variantName,
        colorName,
        flySource,
      });

      if (result?.requiresLogin) {
        openAuthModal("login");
      }

      return result;
    },
    [getCartLine, addToCart, updateQuantity, openAuthModal]
  );

  const handleDecrease = useCallback(
    async (product) => {
      const line = getCartLine(product);
      if (!line) return;

      const nextQty = getDecreasedCartQuantityForProduct(
        product,
        line.quantity,
        line.variantName || ""
      );

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
    },
    [getCartLine, removeFromCart, updateQuantity]
  );

  return {
    getCartLine,
    getCartQuantity,
    handleAdd,
    handleIncrease,
    handleDecrease,
  };
}
