import Cart from "../models/Cart.js";
import Address from "../models/address/Address.js";
import Order from "../models/order/Order.js";
import Product from "../models/Product.js";
import User from "../models/user.js";
import {
  getAvailableColors,
  getUnitPriceForQuantity,
  getVariant,
  getVariantStock,
  isMultiVariant,
  PRODUCT_PRICING_SELECT,
} from "./productPricing.js";

const normalizeVariantName = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeColorName = (value) =>
  typeof value === "string" ? value.trim() : "";

const matchesOrderedItem = (cartItem, orderItem) =>
  String(cartItem?.product || "") === String(orderItem.product || "") &&
  normalizeVariantName(cartItem.variantName) ===
    normalizeVariantName(orderItem.variantName) &&
  normalizeColorName(cartItem.colorName) === normalizeColorName(orderItem.colorName);

const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_CHARGE = 49;

export function normalizeOrderMessage(body = {}) {
  const raw = body.customerMessage ?? body.message ?? body.customerNote ?? "";
  return typeof raw === "string" ? raw.trim().slice(0, 500) : "";
}

const populateCart = (query) =>
  query.populate({
    path: "items.product",
    select: PRODUCT_PRICING_SELECT,
  });

export const populateOrderItems = (query) =>
  query.populate({
    path: "items.product",
    select: "productImages",
  });

export function enrichOrderForResponse(order) {
  const doc = typeof order.toObject === "function" ? order.toObject() : { ...order };

  return {
    ...doc,
    items: (doc.items || []).map((item) => {
      const productImages =
        item.product && typeof item.product === "object" ? item.product.productImages || [] : [];
      const productImage = productImages[0] || "";
      const storedImage = (item.image || "").trim();

      return {
        ...item,
        image: storedImage || productImage,
        productImage,
        product: item.product?._id || item.product,
      };
    }),
  };
}

export function addressToSnapshot(address) {
  const raw = typeof address.toObject === "function" ? address.toObject() : address;

  return {
    fullName: (raw.fullName || raw.name || "").trim(),
    number: String(raw.number || raw.phone || "").trim(),
    email: String(raw.email || "").trim().toLowerCase(),
    shopNo: (raw.shopNo || "").trim(),
    shopName: (raw.shopName || "").trim(),
    fullAddress: (raw.fullAddress || raw.streetArea || raw.landmark || "").trim(),
    landmark: (raw.landmark || "").trim(),
    city: (raw.city || "").trim(),
    state: (raw.state || "").trim(),
    pincode: String(raw.pincode || "").trim(),
  };
}

async function resolveCheckoutItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "No items to checkout", status: 400 };
  }

  const resolved = [];

  for (const entry of rawItems) {
    const productId = entry.productId || entry._id;
    const normalizedVariantName = normalizeVariantName(entry.variantName);
    const normalizedColorName = normalizeColorName(entry.colorName);
    const qty = Number(entry.quantity);

    if (!productId || !Number.isFinite(qty) || qty < 1) {
      return { error: "Invalid checkout item", status: 400 };
    }

    const product = await Product.findById(productId).select(PRODUCT_PRICING_SELECT);
    if (!product || !product.isActive) {
      return {
        error: "One or more products are no longer available",
        status: 404,
      };
    }

    if (isMultiVariant(product)) {
      if (!normalizedVariantName) {
        return {
          error: "Variant selection is required for this product",
          status: 400,
        };
      }

      if (!getVariant(product, normalizedVariantName)) {
        return {
          error: "Selected variant is not available",
          status: 400,
        };
      }
    }

    const availableColors = getAvailableColors(product, normalizedVariantName);
    if (availableColors.length > 0) {
      if (!normalizedColorName) {
        return {
          error: "Color selection is required for this product",
          status: 400,
        };
      }

      const colorMatch = availableColors.some(
        (color) =>
          color.name?.trim().toLowerCase() === normalizedColorName.toLowerCase()
      );

      if (!colorMatch) {
        return {
          error: "Selected color is not available",
          status: 400,
        };
      }
    }

    const availableStock = getVariantStock(product, normalizedVariantName);
    if (qty > availableStock) {
      return {
        error: `Only ${availableStock} units available in stock`,
        status: 400,
      };
    }

    resolved.push({
      product,
      quantity: qty,
      variantName: normalizedVariantName,
      colorName: normalizedColorName,
    });
  }

  return { items: resolved };
}

function buildOrderItemsFromResolved(items) {
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    if (!item.product || !item.product.isActive) {
      return {
        error: "One or more products are no longer available",
        status: 400,
      };
    }

    const variantName = item.variantName || "";
    const colorName = item.colorName || "";
    const price = getUnitPriceForQuantity(item.product, item.quantity, variantName);
    subtotal += price * item.quantity;

    orderItems.push({
      product: item.product._id,
      name: item.product.name,
      brandName: item.product.brandName || "",
      variantName,
      colorName,
      price,
      quantity: item.quantity,
      image: item.product.productImages?.[0] || "",
    });
  }

  return { orderItems, subtotal };
}

export async function prepareOrderData(userId, addressId, options = {}) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    return { error: "Address not found", status: 404 };
  }

  const checkoutMode = options.checkoutItems?.length ? "buyNow" : "cart";
  let itemsToProcess = [];

  if (checkoutMode === "buyNow") {
    const resolved = await resolveCheckoutItems(options.checkoutItems);
    if (resolved.error) {
      return { error: resolved.error, status: resolved.status };
    }
    itemsToProcess = resolved.items;
  } else {
    const cart = await populateCart(Cart.findOne({ user: userId }));
    if (!cart?.items?.length) {
      return { error: "Your cart is empty", status: 400 };
    }
    itemsToProcess = cart.items;
  }

  const built = buildOrderItemsFromResolved(itemsToProcess);
  if (built.error) {
    return built;
  }

  const { orderItems, subtotal } = built;
  const cart = await populateCart(Cart.findOne({ user: userId }));

  const deliveryCharges = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const total = subtotal + deliveryCharges;

  const deliveryAddress = addressToSnapshot(address);
  const requiredSnapshotFields = [
    "fullName",
    "number",
    "email",
    "shopNo",
    "shopName",
    "fullAddress",
    "landmark",
    "city",
    "state",
    "pincode",
  ];
  const hasCompleteAddress = requiredSnapshotFields.every((field) => deliveryAddress[field]);

  if (!hasCompleteAddress) {
    return {
      error:
        "Delivery address is incomplete. Please edit or re-add your address before placing the order.",
      status: 400,
    };
  }

  return {
    orderItems,
    deliveryAddress,
    subtotal,
    deliveryCharges,
    total,
    cart,
    checkoutMode,
  };
}

export async function finalizeOrder({
  userId,
  orderItems,
  deliveryAddress,
  subtotal,
  deliveryCharges,
  total,
  cart,
  checkoutMode = "cart",
  paymentMethod,
  paymentStatus,
  status = "confirm",
  razorpayOrderId,
  razorpayPaymentId,
  codAdvanceAmount = 0,
  codAdvanceRazorpayPaymentId = "",
  paidAt,
  message = "",
}) {
  const orderMessage =
    typeof message === "string" ? message.trim().slice(0, 500) : "";

  const order = await Order.create({
    user: userId,
    items: orderItems,
    deliveryAddress,
    paymentMethod,
    subtotal,
    deliveryCharges,
    total,
    status,
    paymentStatus,
    message: orderMessage,
    ...(razorpayOrderId && { razorpayOrderId }),
    ...(razorpayPaymentId && { razorpayPaymentId }),
    ...(codAdvanceAmount > 0 && { codAdvanceAmount }),
    ...(codAdvanceRazorpayPaymentId && { codAdvanceRazorpayPaymentId }),
    ...(paidAt && { paidAt }),
  });

  await User.findByIdAndUpdate(userId, {
    $addToSet: { orders: order._id },
  });

  if (cart) {
    if (checkoutMode === "buyNow") {
      cart.items = cart.items.filter(
        (item) =>
          !orderItems.some((ordered) => matchesOrderedItem(item, ordered))
      );
    } else {
      cart.items = [];
    }
    await cart.save();
  }

  return order;
}
