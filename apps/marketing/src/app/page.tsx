import Link from "next/link";
import {
  MessageSquare, Users, CreditCard, BarChart2, Globe,
  Smartphone, CheckCircle, Star, ChevronRight, Dumbbell,
  LogIn, RefreshCw, TrendingUp,
} from "lucide-react";
import { Nav, Footer } from "@/components/nav";

const FEATURES = [
  { icon: Users,       title: "Member Management",   desc: "Full member profiles, QR check-ins, bulk import from Excel. Everything at your fingertips." },
  { icon: MessageSquare, title: "WhatsApp Automation", desc: "Auto-send renewal reminders, payment receipts, and birthday wishes via WhatsApp. Zero manual effort." },
  { icon: CreditCard,  title: "GST Invoicing",       desc: "Automatic GST-compliant invoices (CGST + SGST) for every payment. Export for your CA in one click." },
  { icon: LogIn,       title: "QR Check-ins",        desc: "Lightning-fast check-ins via QR code. Works offline. Syncs when reconnected." },
  { icon: RefreshCw,   title: "Renewals Pipeline",   desc: "7-bucket renewal dashboard shows who's expiring when. Bulk-remind with one click." },
  { icon: BarChart2,   title: "Reports & Analytics", desc: "Revenue trends, attendance heatmaps, trainer performance — all in real-time." },
  { icon: Globe,       title: "Gym Website",         desc: "Auto-generated website on your own domain. Three templates. Lead capture built in." },
  { icon: Smartphone,  title: "Member App",          desc: "Members see their plan, check-in history, and workout plan on any device." },
  { icon: TrendingUp,  title: "Leads Pipeline",      desc: "Kanban board for walk-in and website leads. Convert to member in 2 clicks." },
];

const TESTIMONIALS = [
  { name: "Rajesh Kumar", gym: "Iron Forge Fitness, Mumbai", text: "Renewals used to take my receptionist 2 hours every morning. Now GrwFit WhatsApps members automatically. We've recovered ₹3L in lapsed memberships." },
  { name: "Priya Sharma", gym: "Elevate Gym, Bangalore",     text: "The GST invoicing alone saved us ₹15,000/year in accounting fees. Setup took 20 minutes." },
  { name: "Amit Singh",   gym: "Powerzone, Delhi",           text: "Our members love the QR check-in. No more waiting at reception. Check-in takes 2 seconds." },
];

const FAQS = [
  { q: "Is my data safe?",                    a: "All data is stored in India on encrypted servers. We are DPDP Act 2023 compliant. Your member data never leaves India." },
  { q: "Do I need a credit card to start?",   a: "No. Your 14-day free trial starts the moment you sign up with your mobile number. No credit card required." },
  { q: "Can I import my existing members?",   a: "Yes. Upload your Excel or CSV file and we'll import all members with their phone numbers and plan details in minutes." },
  { q: "What payment modes does it support?", a: "UPI, cash, card, bank transfer, and Razorpay online payments with auto-debit mandates for renewals." },
  { q: "Do members need to install an app?",  a: "No. Members access their plan, check-in history, and invoices via a WhatsApp link or m.grwfit.com. No app install needed." },
  { q: "How is GST handled?",                 a: "Every payment auto-generates a GST invoice (CGST 9% + SGST 9%) with sequential invoice numbers. Export all as PDF or Excel for your CA." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Star className="h-4 w-4" fill="currentColor" />
            Trusted by 500+ gyms across India
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            The gym CRM{" "}
            <span className="text-indigo-600">built for India</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Manage members, automate renewals via WhatsApp, generate GST invoices, and grow your gym — all from one dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="https://app.grwfit.com/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Start free 14-day trial →
            </Link>
            <Link
              href="/contact"
              className="border-2 border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Request a demo
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">No credit card required · Setup in 20 minutes · Cancel anytime</p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="py-8 bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
          {[["500+", "Gyms onboarded"], ["50,000+", "Members managed"], ["15+ cities", "Across India"]].map(([val, label]) => (
            <div key={label}>
              <p className="text-2xl sm:text-3xl font-extrabold">{val}</p>
              <p className="text-indigo-200 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything your gym needs</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">One platform. No spreadsheets, no WhatsApp chaos, no missed renewals.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-6 hover:bg-indigo-50 transition-colors group">
                <div className="h-10 w-10 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Up and running in 20 minutes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: "1", title: "Sign up",        desc: "Enter your gym name and mobile number. No forms, no paperwork." },
              { n: "2", title: "Import members", desc: "Upload your Excel file or add members manually. WhatsApp them instantly." },
              { n: "3", title: "Go live",        desc: "Start taking check-ins, recording payments, and sending WhatsApp reminders." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="h-14 w-14 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">{n}</div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 mb-10">All plans include WhatsApp automation, GST invoicing, and member app.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              { name: "Basic",    price: "₹999",  desc: "Up to 200 members",    features: ["Members & check-ins", "Payments & invoicing", "WhatsApp reminders"] },
              { name: "Standard", price: "₹1,999", desc: "Up to 1,000 members",  features: ["Everything in Basic", "Leads pipeline", "Staff app access", "Website CMS"] },
              { name: "Pro",      price: "₹3,999", desc: "Unlimited members",    features: ["Everything in Standard", "Class booking", "Multi-branch", "Analytics"], featured: true },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl border-2 p-6 text-left ${plan.featured ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200"}`}>
                <p className="font-bold text-lg mb-1">{plan.name}</p>
                <p className="text-3xl font-extrabold mb-1">{plan.price}<span className="text-sm font-normal opacity-70">/mo</span></p>
                <p className={`text-sm mb-5 ${plan.featured ? "text-indigo-200" : "text-gray-500"}`}>{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 ${plan.featured ? "text-indigo-200" : "text-green-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="https://app.grwfit.com/signup"
                  className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    plan.featured ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="text-indigo-600 hover:underline text-sm font-medium flex items-center justify-center gap-1">
            See full pricing comparison <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Loved by gym owners across India</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.gym}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="border rounded-xl p-5">
                <p className="font-semibold text-gray-900 mb-2">{q}</p>
                <p className="text-gray-600 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-indigo-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Dumbbell className="h-12 w-12 mx-auto mb-6 text-indigo-300" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to modernise your gym?</h2>
          <p className="text-indigo-200 mb-8 text-lg">Join 500+ gyms across India. 14-day free trial. No credit card.</p>
          <Link
            href="https://app.grwfit.com/signup"
            className="inline-block bg-white text-indigo-600 font-bold px-10 py-4 rounded-xl text-lg hover:bg-indigo-50 transition-colors"
          >
            Start your free trial →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
