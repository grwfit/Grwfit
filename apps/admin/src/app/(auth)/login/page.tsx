"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{
        data: { user: { name: string; email: string; role: string }; accessToken: string };
      }>("/admin/auth/login", { email, password, totpCode });
      sessionStorage.setItem("platform_token", res.data.data.accessToken);
      sessionStorage.setItem("platform_user_email", res.data.data.user.email);
      router.replace("/overview");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? null)
          : null;
      toast.error(msg ?? "Invalid credentials or 2FA code");
      setTotpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive">
              <Shield className="h-8 w-8 text-destructive-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Platform Admin</CardTitle>
          <p className="text-sm text-muted-foreground">Internal access only · 2FA required every session</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="admin@grwfit.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Authenticator Code</label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }}
              maxLength={6}
              className="text-center text-lg tracking-widest font-mono"
            />
          </div>
          <Button className="w-full" onClick={() => void handleLogin()} loading={isLoading}
            disabled={!email || !password || totpCode.length < 6}>
            Login to Platform
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
