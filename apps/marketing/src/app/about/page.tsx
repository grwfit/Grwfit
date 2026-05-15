import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Nav, Footer } from "@/components/nav";

export const metadata: Metadata = {
  title: "About GrwFit",
  description: "GrwFit is built by gym owners for gym owners. Our mission: make world-class gym management accessible to every fitness studio in India.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Dumbbell className="h-8 w-8 text-indigo-600" />
            <h1 className="text-4xl font-extrabold text-gray-900">About GrwFit</h1>
          </div>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
            <p className="text-xl text-gray-600">
              We built GrwFit because we saw gym owners across India losing thousands of rupees every month to missed renewals, manual invoicing, and WhatsApp chaos.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Our Mission</h2>
            <p>
              Make world-class gym management software accessible to every fitness studio in India — from the 50-member local gym in a Tier-3 city to the 5,000-member chain in Mumbai.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Built for India</h2>
            <p>
              GrwFit is designed from the ground up for Indian gyms:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>GST-compliant invoicing (CGST + SGST) with sequential invoice numbers</li>
              <li>WhatsApp-first communication (not email) for renewal reminders</li>
              <li>Phone OTP login — no passwords to forget</li>
              <li>INR-only pricing, stored in paise for perfect GST calculations</li>
              <li>DPDP Act 2023 compliant — your member data stays in India</li>
              <li>Works on 2G/3G connections — optimised for Indian internet</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Data & Privacy</h2>
            <p>
              All data is stored on encrypted servers in India. We are fully compliant with the Digital Personal Data Protection (DPDP) Act 2023. Your members can request their data export or deletion at any time through the member portal.
            </p>
          </div>

          <div className="mt-12 bg-indigo-50 rounded-2xl p-8 text-center">
            <p className="text-lg font-bold text-gray-900 mb-3">Ready to transform your gym?</p>
            <Link
              href="/signup"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Start free 14-day trial →
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
