import axios from "axios";
import { ADMIN_STORAGE_KEY } from "../utils/authStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
});

function getRequestToken() {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!stored) return null;

  try {
    const { token } = JSON.parse(stored);
    return token || null;
  } catch {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
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

export const getAllCategories = () => api.get("/api/categories/all");
export const addCategory = (data) => api.post("/api/categories", data);
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);

export const getAllProducts = () => api.get("/api/products/all");
export const addProduct = (data) => api.post("/api/products", data);
export const updateProduct = (id, data) => api.put(`/api/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/api/products/${id}`);

export const loginUser = (data) => api.post("/api/users/login", data);
export const getUsers = () => api.get("/api/users");
export const updateUser = (id, data) => api.put(`/api/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/api/users/${id}`);

export const getOrderById = (id) => api.get(`/api/orders/${id}`);
export const getAdminOrders = (params) => api.get("/api/orders/admin/all", { params });
export const getDashboardStats = (params) =>
  api.get("/api/orders/admin/dashboard-stats", { params });
export const updateAdminOrder = (id, data) => api.patch(`/api/orders/admin/${id}`, data);

export const getAdminPaymentProofs = (params) => api.get("/api/payments/admin", { params });
export const getAdminPaymentProof = (id) => api.get(`/api/payments/admin/${id}`);
export const updateAdminPaymentProof = (id, data) =>
  api.patch(`/api/payments/admin/${id}`, data);

export const getAdminSupportMessages = () => api.get("/api/support/admin");
export const getAdminSupportMessage = (id) => api.get(`/api/support/admin/${id}`);
export const updateAdminSupportStatus = (id, data) =>
  api.patch(`/api/support/admin/${id}`, data);

export const uploadImageFile = (file, folder) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);
  // Let axios set multipart boundary automatically.
  return api.post("/api/upload/image", formData);
};

export default api;
