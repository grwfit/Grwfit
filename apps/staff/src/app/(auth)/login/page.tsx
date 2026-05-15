"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type Step = "email" | "otp" | "gym-select";

interface GymOption {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface VerifyResponse {
  data: {
    user: { id: string; name: string; email: string | null; role?: string; type: string };
    gymId: string | null;
    gyms?: GymOption[];
    preSelectToken?: string;
  };
}

export default function StaffLoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [gyms, setGyms] = useState<GymOption[]>([]);
  const [preSelectToken, setPreSelectToken] = useState("");
  const router = useRouter();

  const handleSendOtp = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.post("/auth/otp/request", { email: email.trim(), userType: "staff" });
      setStep("otp");
      startResendTimer();
      toast.success("OTP sent to your email");
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) ?? "Failed to send OTP. Check your email address.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<VerifyResponse>("/auth/otp/verify", {
        email: email.trim(),
        otp,
        userType: "staff",
      });

      const { user, gymId, gyms: gymList, preSelectToken: pst } = res.data.data;

      sessionStorage.setItem("auth_user", JSON.stringify(user));

      if (gymList && gymList.length > 1 && pst) {
        setGyms(gymList);
        setPreSelectToken(pst);
        setStep("gym-select");
      } else {
        if (gymId) sessionStorage.setItem("gym_id", gymId);
        if (user.role) sessionStorage.setItem("user_role", user.role);
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) ?? "Invalid OTP. Please try again.";
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

  const handleSelectGym = useCallback(async (gymId: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<VerifyResponse>(
        "/auth/select-gym",
        { gymId },
        { headers: { Authorization: `Bearer ${preSelectToken}` } },
      );
      const { user, gymId: selectedGymId } = res.data.data;
      sessionStorage.setItem("auth_user", JSON.stringify(user));
      if (selectedGymId) sessionStorage.setItem("gym_id", selectedGymId);
      if (user.role) sessionStorage.setItem("user_role", user.role);
      router.replace("/dashboard");
    } catch {
      toast.error("Failed to select gym. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [preSelectToken, router]);

  const startResendTimer = useCallback(() => {
    setResendTimer(30);
    const id = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === "gym-select" ? "Select your gym" : "Staff Login"}
          </CardTitle>
          {step === "email" && (
            <p className="text-sm text-muted-foreground mt-1">
              Enter your registered email address
            </p>
          )}
          {step === "otp" && (
            <p className="text-sm text-muted-foreground mt-1">
              OTP sent to <span className="font-medium">{email}</span>
            </p>
          )}
          {step === "gym-select" && (
            <p className="text-sm text-muted-foreground mt-1">
              Your account is linked to multiple gyms
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {step === "email" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  placeholder="you@yourgym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSendOtp(); }}
                  type="email"
                  autoFocus
                  autoComplete="email"
                />
                <p className="text-xs text-muted-foreground">
                  A 6-digit OTP will be sent to this email
                </p>
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
                <label className="text-sm font-medium text-center block">
                  Enter 6-digit OTP
                </label>
                <OtpInput value={otp} onChange={handleOtpChange} disabled={isLoading} autoFocus />
              </div>

              <Button
                className="w-full"
                onClick={() => void handleVerifyOtp()}
                disabled={otp.length < 6 || isLoading}
              >
                {isLoading ? "Verifying…" : "Verify OTP"}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setStep("email"); setOtp(""); }}
                >
                  ← Change email
                </button>
                <button
                  className="text-primary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                  onClick={() => void handleSendOtp()}
                  disabled={resendTimer > 0 || isLoading}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}

          {step === "gym-select" && (
            <div className="space-y-2">
              {gyms.map((gym) => (
                <button
                  key={gym.id}
                  onClick={() => void handleSelectGym(gym.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 rounded-lg border-2 border-border p-4 hover:border-primary hover:bg-accent transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {gym.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{gym.name}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function extractErrorMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const resp = (err as { response: { data?: { error?: { message?: string } } } }).response;
    return resp?.data?.error?.message ?? null;
  }
  return null;
}
