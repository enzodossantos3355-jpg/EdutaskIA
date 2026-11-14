import axios from "axios";

export const API = "/api";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

const LONG_TIMEOUT_PATHS = [
  "/ai/",
  "/zip/",
  "/whatsapp/",
  "/files/upload",
  "/summaries",
  "/summary-topics",
  "/monthly-prize",
  "/generate-answer",
  "/plurall/",
];

// Request interceptor: attach bearer token, handle FormData and route-aware timeout
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    const url = String(config.url || "");
    if (
      (!config.timeout || config.timeout === 12000) &&
      LONG_TIMEOUT_PATHS.some((p) => url.includes(p))
    ) {
      config.timeout = 120000;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: reject HTML SPA rewrites and handle 401 token invalidation if needed
api.interceptors.response.use(
  (response) => {
    const respType = response.config?.responseType;
    if (respType !== "blob" && respType !== "arraybuffer" && respType !== "text") {
      const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
      const isHtmlPayload =
        contentType.includes("text/html") ||
        (typeof response.data === "string" && /^\s*<!doctype|^\s*<html/i.test(response.data));
      if (isHtmlPayload) {
        return Promise.reject(new Error("API indisponível (resposta HTML recebida no lugar de JSON)"));
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
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
