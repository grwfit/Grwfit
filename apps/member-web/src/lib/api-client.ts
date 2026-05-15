import axios from "axios";

const _base   = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";
const API_URL = _base.endsWith("/api/v1") ? _base : `${_base.replace(/\/$/, "")}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // httpOnly cookies sent automatically
  headers: { "Content-Type": "application/json" },
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status: number };
      config?: { _retry?: boolean; url?: string } & Record<string, unknown>;
    };
    const isAuthEndpoint = axiosError.config?.url?.includes("/auth/");
    if (axiosError.response?.status === 401 && !axiosError.config?._retry && !isAuthEndpoint) {
      if (axiosError.config) {
        axiosError.config._retry = true;
        try {
          await apiClient.post("/auth/refresh");
          return apiClient(axiosError.config);
        } catch {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  },
);
