import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@grwfit/ui/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "GrwFit — Gym Management Software for India", template: "%s | GrwFit" },
  description: "Complete gym CRM for Indian gyms. Manage members, payments, check-ins, and renewals. WhatsApp automation, GST invoicing, and more. Start free.",
  keywords: ["gym CRM India", "gym management software", "fitness studio software", "gym software India"],
  openGraph: {
    title: "GrwFit — Gym Management Software for India",
    description: "Complete CRM for Indian gyms. Members, payments, WhatsApp, and more.",
    type: "website",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
