"use client";

import { useState } from "react";
import { Nav, Footer } from "@/components/nav";
import { submitDemoRequest } from "@/lib/demo-request";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", gymName: "", city: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const ok = await submitDemoRequest(form);
    setStatus(ok ? "success" : "error");
  };

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-xl mx-auto">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Request a Demo</h1>
          <p className="text-gray-500 mb-10">See GrwFit in action for your gym. We'll set up a 20-minute demo call within 24 hours.</p>

          {status === "success" ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-bold text-green-700 mb-2">Demo request received!</p>
              <p className="text-green-600 text-sm">We'll call you on WhatsApp within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { k: "name", label: "Your Name", placeholder: "Rahul Sharma", required: true },
                { k: "gymName", label: "Gym Name", placeholder: "Iron Forge Fitness", required: true },
                { k: "phone", label: "Mobile Number", placeholder: "+91 9XXXXXXXXX", required: true },
                { k: "email", label: "Email", placeholder: "rahul@ironforge.in", required: true },
                { k: "city", label: "City", placeholder: "Mumbai", required: false },
              ].map(({ k, label, placeholder, required }) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && "*"}</label>
                  <input
                    required={required}
                    value={form[k as keyof typeof form]}
                    onChange={set(k)}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                {status === "loading" ? "Sending…" : "Request Demo →"}
              </button>
              {status === "error" && (
                <p className="text-red-500 text-xs text-center">Something went wrong. Email us at hello@grwfit.com</p>
              )}
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
