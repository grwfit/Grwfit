"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { OtpInput } from "@/components/auth/otp-input";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type Step = "phone" | "otp" | "gym-select";

interface GymOption {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface VerifyResponse {
  data: {
    user: { id: string; name: string; phone: string; role?: string; type: string };
    gymId: string | null;
    gyms?: GymOption[];
    preSelectToken?: string;
  };
}

export default function StaffLoginPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [gyms, setGyms] = useState<GymOption[]>([]);
  const [preSelectToken, setPreSelectToken] = useState("");
  const router = useRouter();

  const handleSendOtp = useCallback(async () => {
    const formatted = phone.trim().startsWith("+91") ? phone.trim() : `+91${phone.trim()}`;
    setIsLoading(true);
    try {
      await apiClient.post("/auth/otp/request", { phone: formatted, userType: "staff" });
      setStep("otp");
      startResendTimer();
      toast.success("OTP sent to your WhatsApp");
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) ?? "Failed to send OTP. Check your number.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [phone]);

  const handleVerifyOtp = useCallback(async () => {
    const formatted = phone.trim().startsWith("+91") ? phone.trim() : `+91${phone.trim()}`;
    setIsLoading(true);
    try {
      const res = await apiClient.post<VerifyResponse>("/auth/otp/verify", {
        phone: formatted,
        otp,
        userType: "staff",
      });

      const { user, gymId, gyms: gymList, preSelectToken: pst } = res.data.data;

      // Store non-sensitive user info for display (NOT the token)
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
  }, [phone, otp, router]);

  // Auto-submit when all 6 digits are entered
  const handleOtpChange = useCallback(
    (val: string) => {
      setOtp(val);
      if (val.length === 6 && !isLoading) {
        void handleVerifyOtp();
      }
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

  const handlePhoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") void handleSendOtp();
    },
    [handleSendOtp],
  );

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
          {step === "phone" && (
            <p className="text-sm text-muted-foreground mt-1">
              Enter your registered phone number
            </p>
          )}
          {step === "otp" && (
            <p className="text-sm text-muted-foreground mt-1">
              OTP sent to <span className="font-medium">+91 {phone}</span>
            </p>
          )}
          {step === "gym-select" && (
            <p className="text-sm text-muted-foreground mt-1">
              Your account is linked to multiple gyms
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {step === "phone" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none">
                    +91
                  </span>
                  <Input
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={handlePhoneKeyDown}
                    className="rounded-l-none"
                    type="tel"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll send a 6-digit OTP via WhatsApp
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => void handleSendOtp()}
                loading={isLoading}
                disabled={phone.length < 10}
              >
                Send OTP
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium text-center block">
                  Enter 6-digit OTP
                </label>
                <OtpInput
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <Button
                className="w-full"
                onClick={() => void handleVerifyOtp()}
                loading={isLoading}
                disabled={otp.length < 6}
              >
                Verify OTP
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setStep("phone"); setOtp(""); }}
                >
                  ← Change number
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
      <p className="text-center text-xs text-muted-foreground mt-4">
        New gym?{" "}
        <a href="/signup" className="text-primary hover:underline font-medium">Start your 14-day free trial →</a>
      </p>
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
