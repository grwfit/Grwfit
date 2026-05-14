"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { StaffRole } from "@grwfit/shared-types";

interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role?: StaffRole;
  type: "staff" | "member";
}

interface AuthContextValue {
  user: AuthUser | null;
  gymId: string | null;
  role: StaffRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  canAccess: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const initAuth = useCallback(async () => {
    // First, check sessionStorage for user info (set on login, cleared on logout)
    const stored = sessionStorage.getItem("auth_user");
    const storedGymId = sessionStorage.getItem("gym_id");

    if (stored) {
      const parsed = JSON.parse(stored) as AuthUser;
      setUser(parsed);
      setGymId(storedGymId);
      setIsLoading(false);
      return;
    }

    // If nothing in sessionStorage, try /auth/me — the httpOnly cookie
    // will be sent automatically
    if (!isPublicPath) {
      try {
        const res = await apiClient.get<{
          data: { id: string; name: string; phone: string; role?: StaffRole; gymId?: string; type: "staff" | "member" };
        }>("/auth/me");
        const userData = res.data.data;
        setUser({ id: userData.id, name: userData.name, phone: userData.phone, role: userData.role, type: userData.type });
        setGymId(userData.gymId ?? null);
        sessionStorage.setItem("auth_user", JSON.stringify(userData));
        if (userData.gymId) sessionStorage.setItem("gym_id", userData.gymId);
      } catch {
        // No valid session — redirect to login
        router.replace("/login");
      }
    }

    setIsLoading(false);
  }, [isPublicPath, router]);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      sessionStorage.clear();
      setUser(null);
      setGymId(null);
      router.replace("/login");
    }
  }, [router]);

  const role = (user?.role as StaffRole | null) ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        gymId,
        role,
        isLoading,
        isAuthenticated: !!user,
        canAccess: !!user || isPublicPath,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
