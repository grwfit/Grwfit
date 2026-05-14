import axios from "axios";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000/api/v1";

// platform_token is set as httpOnly cookie — browser sends it automatically
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const axiosError = error as { response?: { status: number }; config?: { url?: string } };
    if (axiosError.response?.status === 401 && !axiosError.config?.url?.includes("/auth/")) {
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
