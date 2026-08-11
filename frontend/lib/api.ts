import axios from "axios";
import { BACKEND_URL } from "./config";

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Automatically attach Bearer token if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle unauthenticated 401 errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // If token expired or session revoked
      const currentPath = window.location.pathname;
      const isAuthPage =
        currentPath.startsWith("/login") ||
        currentPath.startsWith("/signup") ||
        currentPath.startsWith("/forgot-password") ||
        currentPath.startsWith("/reset-password") ||
        currentPath.startsWith("/auth/callback");

      if (!isAuthPage && localStorage.getItem("auth_token")) {
        localStorage.removeItem("auth_token");
      }
    }
    return Promise.reject(error);
  }
);

export default api;