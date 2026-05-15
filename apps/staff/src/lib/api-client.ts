import axios from "axios";
import type { AxiosInstance } from "axios";

const _base   = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";
const API_URL = _base.endsWith("/api/v1") ? _base : `${_base.replace(/\/$/, "")}/api/v1`;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send httpOnly cookies automatically
  headers: { "Content-Type": "application/json" },
});

// Auto-refresh on 401 — the refresh token is in an httpOnly cookie,
// browser sends it automatically to /api/v1/auth/refresh
let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status: number };
      config?: { _retry?: boolean; url?: string } & Record<string, unknown>;
    };

    const isAuthEndpoint = axiosError.config?.url?.includes("/auth/");
    if (
      axiosError.response?.status === 401 &&
      !axiosError.config?._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push((ok) => {
            if (ok && axiosError.config) {
              axiosError.config._retry = true;
              resolve(apiClient(axiosError.config));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;
      if (axiosError.config) axiosError.config._retry = true;

      try {
        await apiClient.post("/auth/refresh");
        refreshQueue.forEach((cb) => cb(true));
        refreshQueue = [];
        if (axiosError.config) return apiClient(axiosError.config);
      } catch {
        refreshQueue.forEach((cb) => cb(false));
        refreshQueue = [];
        // Refresh failed — redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
