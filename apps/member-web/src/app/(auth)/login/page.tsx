"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type Step = "email" | "otp";

export default function MemberLoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.post("/auth/otp/request", { email: email.trim(), userType: "member" });
      setStep("otp");
      startResendTimer();
      toast.success("OTP sent to your email");
    } catch (err: unknown) {
      const msg = extractError(err) ?? "Failed to send OTP";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{
        data: { user: { id: string; name: string; type: string }; gymId: string | null };
      }>("/auth/otp/verify", { email: email.trim(), otp, userType: "member" });

      const { user, gymId } = res.data.data;
      sessionStorage.setItem("auth_user", JSON.stringify(user));
      if (gymId) sessionStorage.setItem("gym_id", gymId);
      router.replace("/home");
    } catch (err: unknown) {
      const msg = extractError(err) ?? "Invalid OTP";
      toast.error(msg);
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }, [email, otp, router]);

  const handleOtpChange = useCallback(
    (val: string) => {
      setOtp(val);
      if (val.length === 6 && !isLoading) void handleVerifyOtp();
    },
    [handleVerifyOtp, isLoading],
  );

  const startResendTimer = useCallback(() => {
    setResendTimer(30);
    const id = setInterval(() => {
      setResendTimer((t) => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; });
    }, 1000);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Member Login</CardTitle>
          {step === "otp" && (
            <p className="text-sm text-muted-foreground mt-1">OTP sent to {email}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {step === "email" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSendOtp(); }}
                  type="email"
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => void handleSendOtp()}
                disabled={!email.includes("@") || isLoading}
              >
                {isLoading ? "Sending…" : "Send OTP"}
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="space-y-3">
                <p className="text-sm font-medium text-center">Enter 6-digit OTP</p>
                <OtpInput value={otp} onChange={handleOtpChange} disabled={isLoading} autoFocus />
              </div>
              <Button
                className="w-full"
                onClick={() => void handleVerifyOtp()}
                disabled={otp.length < 6 || isLoading}
              >
                {isLoading ? "Verifying…" : "Verify OTP"}
              </Button>
              <div className="flex justify-between text-sm">
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep("email"); setOtp(""); }}
                >
                  ← Change email
                </button>
                <button
                  className="text-primary disabled:text-muted-foreground"
                  onClick={() => void handleSendOtp()}
                  disabled={resendTimer > 0 || isLoading}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function extractError(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}
