import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STORAGE_KEY = "bmm_auth";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
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

export default api;
