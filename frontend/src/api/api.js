import axios from "axios";
import { ADMIN_STORAGE_KEY, STORAGE_KEY } from "../utils/authStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
});

function getRequestToken() {
  if (typeof window === "undefined") return null;

  const isAdminPath = window.location.pathname.startsWith("/admin");
  const storageKey = isAdminPath ? ADMIN_STORAGE_KEY : STORAGE_KEY;
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) return token;
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  return null;
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
export const getAllHeroBanners = () => api.get("/api/herobanners/all");
export const addHeroBanner = (data) =>
  api.post("/api/herobanners", data, {
    params: { device: data.bannerFor || data.device },
  });
export const updateHeroBanner = (id, data) =>
  api.put(`/api/herobanners/${id}`, data, {
    params: { device: data.bannerFor || data.device },
  });
export const deleteHeroBanner = (id) => api.delete(`/api/herobanners/${id}`);

export const getCategories = () => api.get("/api/categories");
export const getAllCategories = () => api.get("/api/categories/all");
export const getCategoryById = (id) => api.get(`/api/categories/${id}`);
export const addCategory = (data) => api.post("/api/categories", data);
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);

export const getProducts = (params) => api.get("/api/products", { params });
export const getAllProducts = () => api.get("/api/products/all");
export const getProductById = (id) => api.get(`/api/products/${id}`);
export const addProduct = (data) => api.post("/api/products", data);
export const updateProduct = (id, data) => api.put(`/api/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/api/products/${id}`);

export const getCart = () => api.get("/api/cart");
export const addToCartItem = (data) => api.post("/api/cart", data);
export const removeFromCartItem = (productId) =>
  api.delete(`/api/cart/${productId}`);
export const updateCartItemQty = (productId, quantity) =>
  api.put(`/api/cart/${productId}`, { quantity });

export const signupUser = (data) => api.post("/api/users/signup", data);
export const loginUser = (data) => api.post("/api/users/login", data);
export const getMe = () => api.get("/api/users/me");
export const getUsers = () => api.get("/api/users");
export const updateUser = (id, data) => api.put(`/api/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/api/users/${id}`);

function buildAddressPayload(data) {
  const name = data.name?.trim() || "";
  const number = data.number?.trim() || "";
  const landmark = data.landmark?.trim() || "";
  const city = data.city?.trim() || "";
  const state = data.state?.trim() || "";
  const pincode = data.pincode?.trim() || "";

  return {
    name,
    number,
    landmark,
    city,
    state,
    pincode,
    isDefault: data.isDefault,
    // legacy aliases — keeps old backend instances working until restarted
    fullName: name,
    phone: number,
    streetArea: landmark,
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
export const getMyOrders = () => api.get("/api/orders");
export const getOrderById = (id) => api.get(`/api/orders/${id}`);
export const getAdminOrders = (params) => api.get("/api/orders/admin/all", { params });
export const getDashboardStats = (params) =>
  api.get("/api/orders/admin/dashboard-stats", { params });
export const updateAdminOrder = (id, data) => api.patch(`/api/orders/admin/${id}`, data);
export const cancelOrder = (id) => api.patch(`/api/orders/${id}/cancel`);

export default api;
