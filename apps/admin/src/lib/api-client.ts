import axios from "axios";

const _base   = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";
const API_URL = _base.endsWith("/api/v1") ? _base : `${_base.replace(/\/$/, "")}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach platform token from sessionStorage on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("platform_token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const axiosError = error as { response?: { status: number }; config?: { url?: string } };
    if (axiosError.response?.status === 401 && !axiosError.config?.url?.includes("/auth/")) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("platform_token");
        sessionStorage.removeItem("platform_user_email");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
