import axios from "axios";

export const API = "/api";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach bearer token and handle FormData
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 token invalidation if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized, clean stale tokens
      const currentPath = window.location.pathname;
      if (currentPath !== "/" && currentPath !== "/login") {
        console.warn("[Auth] Sessão expirada ou não autorizada");
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(err) {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err.response?.data?.detail) {
    const d = err.response.data.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((e) => e.msg || e.message || JSON.stringify(e)).join(", ");
    return JSON.stringify(d);
  }
  if (err.response?.data?.message) return err.response.data.message;
  if (err.message) return err.message;
  return JSON.stringify(err);
}

export default api;
