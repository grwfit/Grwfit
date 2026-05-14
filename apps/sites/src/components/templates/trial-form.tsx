"use client";

import { useState } from "react";
import { submitTrialBooking } from "@/lib/gym-data";

export function TrialForm({ gymSlug }: { gymSlug: string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const ok = await submitTrialBooking({
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      gymSlug,
    });
    setStatus(ok ? "success" : "error");
  };

  if (status === "success") {
    return (
      <div className="text-center py-6">
        <p className="text-2xl font-bold mb-2">🎉 You're in!</p>
        <p className="text-muted">We'll reach out on WhatsApp shortly to confirm your trial.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm mx-auto">
      <input
        required
        value={form.name}
        onChange={set("name")}
        placeholder="Your name"
        className="w-full border rounded-lg px-4 py-3 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        required
        value={form.phone}
        onChange={set("phone")}
        placeholder="Mobile number (+91...)"
        className="w-full border rounded-lg px-4 py-3 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        value={form.email}
        onChange={set("email")}
        placeholder="Email (optional)"
        type="email"
        className="w-full border rounded-lg px-4 py-3 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "Booking..." : "Book My Free Trial →"}
      </button>
      {status === "error" && (
        <p className="text-red-500 text-xs text-center">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
