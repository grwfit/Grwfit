"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Button, Card, CardContent, Input } from "@grwfit/ui";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

function extractError(err: unknown): string | null {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? null;
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    gymName: "", ownerName: "", phone: "", email: "", city: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post("/onboarding/signup", {
        gymName: form.gymName,
        ownerName: form.ownerName,
        phone: form.phone.startsWith("+91") ? form.phone : `+91${form.phone}`,
        email: form.email || undefined,
        city: form.city || undefined,
      });
      toast.success("Account created! Let's set up your gym.");
      router.replace("/onboarding");
    } catch (err: unknown) {
      toast.error(extractError(err) ?? "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Dumbbell className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Start your free trial</h1>
          <p className="text-muted-foreground mt-1">14 days free. No credit card required.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Gym Name *</label>
                <Input value={form.gymName} onChange={set("gymName")} placeholder="Iron Forge Fitness" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Your Name *</label>
                <Input value={form.ownerName} onChange={set("ownerName")} placeholder="Rahul Sharma" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number *</label>
                <div className="flex gap-2">
                  <span className="border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground">+91</span>
                  <Input
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="9XXXXXXXXX"
                    required
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email (optional)</label>
                <Input value={form.email} onChange={set("email")} type="email" placeholder="you@gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City (optional)</label>
                <Input value={form.city} onChange={set("city")} placeholder="Mumbai" />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating your gym..." : "Start Free Trial →"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
