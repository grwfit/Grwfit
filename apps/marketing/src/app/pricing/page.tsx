import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, X } from "lucide-react";
import { Nav, Footer } from "@/components/nav";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for Indian gyms. Basic ₹999, Standard ₹1,999, Pro ₹3,999/month. 14-day free trial.",
};

// Prices sourced from this file — in production, pull from DB/config
const PLANS: Array<{ name: string; price: number; memberLimit: number | null; annualDiscount: number; popular?: boolean }> = [
  { name: "Basic",    price: 999,   memberLimit: 200,   annualDiscount: 2 },
  { name: "Standard", price: 1999,  memberLimit: 1000,  annualDiscount: 2, popular: true },
  { name: "Pro",      price: 3999,  memberLimit: null,  annualDiscount: 2 },
];

const FEATURES: Array<{ label: string; basic: boolean | string; standard: boolean | string; pro: boolean | string }> = [
  { label: "Members",              basic: "Up to 200",      standard: "Up to 1,000",  pro: "Unlimited" },
  { label: "Branches",             basic: "1",              standard: "1",            pro: "Unlimited" },
  { label: "Check-in (QR)",        basic: true,             standard: true,           pro: true },
  { label: "Payments & GST invoicing", basic: true,         standard: true,           pro: true },
  { label: "WhatsApp automation",  basic: true,             standard: true,           pro: true },
  { label: "Renewal reminders",    basic: true,             standard: true,           pro: true },
  { label: "Member portal",        basic: true,             standard: true,           pro: true },
  { label: "Leads pipeline",       basic: false,            standard: true,           pro: true },
  { label: "Staff management",     basic: false,            standard: true,           pro: true },
  { label: "Gym website + CMS",    basic: false,            standard: true,           pro: true },
  { label: "Reports & analytics",  basic: "Basic",          standard: "Advanced",     pro: "Full" },
  { label: "Class booking",        basic: false,            standard: false,          pro: true },
  { label: "Trainer commission",   basic: false,            standard: false,          pro: true },
  { label: "Custom domain",        basic: false,            standard: true,           pro: true },
  { label: "API access",           basic: false,            standard: false,          pro: true },
  { label: "Priority support",     basic: false,            standard: "Email",        pro: "WhatsApp + Email" },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value
      ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
      : <X className="h-4 w-4 text-gray-300 mx-auto" />;
  }
  return <span className="text-sm text-gray-700">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h1>
            <p className="text-gray-500 text-lg">All plans include a 14-day free trial. Annual plans save 2 months.</p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border-2 p-6 ${plan.popular ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200"}`}>
                {plan.popular && (
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-2">Most Popular</p>
                )}
                <p className="text-xl font-bold mb-1">{plan.name}</p>
                <p className="text-4xl font-extrabold mb-1">₹{plan.price.toLocaleString("en-IN")}</p>
                <p className={`text-sm mb-2 ${plan.popular ? "text-indigo-200" : "text-gray-500"}`}>/month, billed monthly</p>
                <p className={`text-sm mb-6 ${plan.popular ? "text-indigo-200" : "text-gray-500"}`}>
                  {plan.memberLimit ? `Up to ${plan.memberLimit.toLocaleString()} members` : "Unlimited members"}
                </p>
                <Link
                  href="/signup"
                  className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-colors ${
                    plan.popular ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>

          {/* Feature comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="py-3 px-4 text-left font-semibold text-gray-900 w-1/2">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.name} className="py-3 px-4 text-center font-semibold text-gray-900">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {FEATURES.map((row) => (
                  <tr key={row.label} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{row.label}</td>
                    <td className="py-3 px-4 text-center"><Cell value={row.basic} /></td>
                    <td className="py-3 px-4 text-center"><Cell value={row.standard} /></td>
                    <td className="py-3 px-4 text-center"><Cell value={row.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500 mb-4">Need a custom plan for your gym chain?</p>
            <Link href="/contact" className="text-indigo-600 hover:underline font-medium">Contact our sales team →</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
