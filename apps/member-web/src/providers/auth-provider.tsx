"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";

const PUBLIC_PATHS = ["/login"];

interface MemberSession {
  userId: string;
  gymId: string;
  name: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  planName: string | null;
  planPricePaise: number | null;
  expiresAt: string | null;
  daysLeft: number | null;
  status: string;
  branchName: string | null;
  streak: number;
  onboardingCompleted: boolean;
}

interface AuthContextValue {
  session: MemberSession | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MemberSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  const refreshSession = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: MemberSession }>("/members/me");
      setSession(res.data.data);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    if (isPublic) { setIsLoading(false); return; }
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession, isPublic]);

  const logout = useCallback(async () => {
    try { await apiClient.post("/auth/logout"); } catch { /* ignore */ }
    setSession(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ session, isLoading, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
