"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell, CheckCircle } from "lucide-react";
import { Nav, Footer } from "@/components/nav";

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000/api/v1";

export default function SignupPage() {
  const [form, setForm] = useState({
    gymName: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set =
    (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/onboarding/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymName: form.gymName,
          ownerName: form.ownerName,
          phone: form.phone.startsWith("+91")
            ? form.phone
            : `+91${form.phone.replace(/\s/g, "")}`,
          email: form.email || undefined,
          city: form.city || undefined,
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const body = await res.json().catch(() => null);
        setErrorMsg(
          body?.error?.message ?? "Signup failed. Please try again."
        );
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Dumbbell className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
            <h1 className="text-3xl font-extrabold text-gray-900">
              Start your free trial
            </h1>
            <p className="text-gray-500 mt-2">
              14 days free. No credit card required.
            </p>
          </div>

          {status === "success" ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-green-700 text-lg mb-2">
                Your gym account is created!
              </p>
              <p className="text-green-600 text-sm mb-4">
                We&apos;ll send you a login link on WhatsApp shortly.
              </p>
              <p className="text-gray-500 text-xs">
                Check your WhatsApp on{" "}
                <span className="font-medium">
                  +91{form.phone.replace(/^\+91/, "")}
                </span>
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-50 rounded-2xl p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gym Name *
                </label>
                <input
                  required
                  value={form.gymName}
                  onChange={set("gymName")}
                  placeholder="Iron Forge Fitness"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  required
                  value={form.ownerName}
                  onChange={set("ownerName")}
                  placeholder="Rahul Sharma"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <div className="flex gap-2">
                  <span className="border border-gray-300 rounded-xl px-4 py-3 text-sm bg-gray-100 text-gray-500 shrink-0">
                    +91
                  </span>
                  <input
                    required
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="9XXXXXXXXX"
                    pattern="[0-9]{10}"
                    title="Enter a 10-digit mobile number"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@gmail.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City (optional)
                </label>
                <input
                  value={form.city}
                  onChange={set("city")}
                  placeholder="Mumbai"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
              >
                {status === "loading"
                  ? "Creating your gym..."
                  : "Start Free Trial →"}
              </button>

              {status === "error" && (
                <p className="text-red-500 text-xs text-center">{errorMsg}</p>
              )}

              <p className="text-xs text-gray-400 text-center">
                Already have an account?{" "}
                <Link
                  href="https://app.grwfit.com/login"
                  className="text-indigo-600 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-6">
            By signing up, you agree to our{" "}
            <Link
              href="/terms-of-service"
              className="text-indigo-600 hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              className="text-indigo-600 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
