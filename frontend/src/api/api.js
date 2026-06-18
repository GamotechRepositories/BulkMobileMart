import axios from "axios";
import { STORAGE_KEY } from "../utils/authStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const api = axios.create({
  baseURL: API_URL,
});

function getRequestToken() {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const { token } = JSON.parse(stored);
    return token || null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = getRequestToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const getHeroBanners = (device = "desktop") =>
  api.get("/api/herobanners", { params: { device } });

export const getCategories = () => api.get("/api/categories");
export const getCategoryById = (id) => api.get(`/api/categories/${id}`);

export const getBrands = () => api.get("/api/brands");
export const getTestimonials = () => api.get("/api/testimonials");

export const getStoreSettings = () => api.get("/api/settings");

export const getProducts = (params) => api.get("/api/products", { params });
export const getProductById = (id) => api.get(`/api/products/${id}`);

export const getCart = () => api.get("/api/cart");
export const addToCartItem = (data) => api.post("/api/cart", data);
export const removeFromCartItem = (productId, variantName = "", colorName = "") =>
  api.delete(`/api/cart/${productId}`, { params: { variantName, colorName } });
export const updateCartItemQty = (productId, quantity, variantName = "", colorName = "") =>
  api.put(`/api/cart/${productId}`, { quantity, variantName, colorName });

export const getWishlist = () => api.get("/api/wishlist");
export const toggleWishlistItem = (productId) =>
  api.post("/api/wishlist/toggle", { productId });
export const removeFromWishlistItem = (productId) =>
  api.delete(`/api/wishlist/${productId}`);

export const signupUser = (data) => api.post("/api/users/signup", data);
export const loginUser = (data) => api.post("/api/users/login", data);
export const getMe = () => api.get("/api/users/me");

function buildAddressPayload(data) {
  const fullName = data.fullName?.trim() || data.name?.trim() || "";
  const number = data.number?.trim() || data.phone?.trim() || "";
  const email = data.email?.trim() || "";
  const shopNo = data.shopNo?.trim() || "";
  const shopName = data.shopName?.trim() || "";
  const fullAddress = data.fullAddress?.trim() || data.streetArea?.trim() || "";
  const landmark = data.landmark?.trim() || "";
  const city = data.city?.trim() || "";
  const state = data.state?.trim() || "";
  const pincode = data.pincode?.trim() || "";

  return {
    fullName,
    number,
    email,
    shopNo,
    shopName,
    fullAddress,
    landmark,
    city,
    state,
    pincode,
    isDefault: data.isDefault,
    name: fullName,
    phone: number,
    streetArea: fullAddress,
  };
}

export const getAddresses = () => api.get("/api/addresses");
export const addAddress = (data) => api.post("/api/addresses", buildAddressPayload(data));
export const updateAddress = (id, data) =>
  api.put(`/api/addresses/${id}`, buildAddressPayload(data));
export const deleteAddress = (id) => api.delete(`/api/addresses/${id}`);

export const placeOrder = (data) => api.post("/api/orders", data);
export const createRazorpayOrder = (data) => api.post("/api/payments/create-order", data);
export const verifyRazorpayPayment = (data) => api.post("/api/payments/verify", data);
export const submitUpiPaymentProof = (data) => api.post("/api/payments/submit-upi-proof", data);
export const getMyOrders = () => api.get("/api/orders");
export const getOrderById = (id) => api.get(`/api/orders/${id}`);
export const cancelOrder = (id) => api.patch(`/api/orders/${id}/cancel`);

export const submitSupportMessage = (data) => api.post("/api/support", data);

export const uploadImageFile = (file, folder) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);
  // Let axios set multipart boundary automatically.
  return api.post("/api/upload/image", formData);
};

export default api;
