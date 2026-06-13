import Cart from "../models/Cart.js";
import Address from "../models/address/Address.js";
import Order from "../models/order/Order.js";
import User from "../models/user.js";

const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_CHARGE = 49;

export function normalizeOrderMessage(body = {}) {
  const raw = body.customerMessage ?? body.message ?? body.customerNote ?? "";
  return typeof raw === "string" ? raw.trim().slice(0, 500) : "";
}

const populateCart = (query) =>
  query.populate({
    path: "items.product",
    select: "name brandName discountedPrice productImages isActive",
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

export async function prepareOrderData(userId, addressId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    return { error: "Address not found", status: 404 };
  }

  const cart = await populateCart(Cart.findOne({ user: userId }));
  if (!cart?.items?.length) {
    return { error: "Your cart is empty", status: 400 };
  }

  const orderItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    if (!item.product || !item.product.isActive) {
      return {
        error: "One or more products in your cart are no longer available",
        status: 400,
      };
    }

    const price = item.product.discountedPrice;
    subtotal += price * item.quantity;

    orderItems.push({
      product: item.product._id,
      name: item.product.name,
      brandName: item.product.brandName || "",
      price,
      quantity: item.quantity,
      image: item.product.productImages?.[0] || "",
    });
  }

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

  cart.items = [];
  await cart.save();

  return order;
}
