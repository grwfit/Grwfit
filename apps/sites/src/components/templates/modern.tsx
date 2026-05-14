import { Dumbbell, MapPin, Phone, Clock, Users, Award, CheckCircle } from "lucide-react";
import { TrialForm } from "./trial-form";
import type { GymSiteData } from "@/lib/gym-data";

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

function daysToLabel(days: number) {
  if (days >= 365) return `${Math.round(days / 365)} year${days >= 730 ? "s" : ""}`;
  if (days >= 30) return `${Math.round(days / 30)} month${days >= 60 ? "s" : ""}`;
  return `${days} days`;
}

export function ModernTemplate({ data }: { data: GymSiteData }) {
  const { gym, plans, trainers } = data;
  const content = gym.website?.content ?? {};
  const hero = content.hero ?? {};
  const about = content.about ?? {};
  const contact = content.contact ?? {};
  const address = gym.address as Record<string, string>;

  return (
    <div className="min-h-screen font-sans">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          {gym.logoUrl ? (
            <img src={gym.logoUrl} alt={gym.name} className="h-16 mx-auto mb-6 object-contain" />
          ) : (
            <Dumbbell className="h-14 w-14 mx-auto mb-6 text-indigo-300" />
          )}
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            {hero.headline ?? gym.name}
          </h1>
          <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">
            {hero.subheadline ?? "Transform your body. Transform your life."}
          </p>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 max-w-md mx-auto">
            <p className="font-semibold mb-4">{hero.ctaText ?? "Book a Free Trial"}</p>
            <TrialForm gymSlug={gym.slug} />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-indigo-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Users,  value: "500+",  label: "Active Members" },
            { icon: Award,  value: "10+",   label: "Expert Trainers" },
            { icon: Clock,  value: "6am",   label: "Opens Early" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label}>
              <Icon className="h-6 w-6 mx-auto mb-1 text-indigo-200" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-indigo-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {about.title ?? `About ${gym.name}`}
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            {about.body ?? "We are passionate about fitness and committed to helping every member achieve their goals."}
          </p>
          {(about.features ?? ["Expert Trainers", "Modern Equipment", "Flexible Timings", "Proven Results"]).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(about.features ?? ["Expert Trainers", "Modern Equipment", "Flexible Timings", "Proven Results"]).map((f) => (
                <div key={f} className="flex items-center gap-2 bg-indigo-50 rounded-xl p-4">
                  <CheckCircle className="h-5 w-5 text-indigo-600 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Plans */}
      {plans.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Membership Plans</h2>
            <div className={`grid gap-6 ${plans.length === 1 ? "max-w-xs mx-auto" : plans.length === 2 ? "grid-cols-2 max-w-lg mx-auto" : "grid-cols-1 md:grid-cols-3"}`}>
              {plans.map((plan, i) => {
                const featured = i === Math.floor(plans.length / 2);
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border-2 p-6 text-center ${
                      featured ? "border-indigo-600 bg-indigo-600 text-white shadow-xl scale-105" : "border-gray-200 bg-white"
                    }`}
                  >
                    <h3 className={`text-lg font-bold mb-2 ${featured ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                    <p className="text-3xl font-extrabold mb-1">{paiseToRupees(plan.pricePaise)}</p>
                    <p className={`text-sm mb-6 ${featured ? "text-indigo-200" : "text-gray-500"}`}>
                      {daysToLabel(plan.durationDays)}
                    </p>
                    <a
                      href="#trial"
                      className={`block w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                        featured
                          ? "bg-white text-indigo-600 hover:bg-indigo-50"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      Join Now
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Trainers */}
      {trainers.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">Our Trainers</h2>
            <div className="flex flex-wrap justify-center gap-6">
              {trainers.map((t) => (
                <div key={t.id} className="text-center">
                  <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-2 text-2xl font-bold text-indigo-600">
                    {t.name.charAt(0)}
                  </div>
                  <p className="font-semibold text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-500">Trainer</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section id="trial" className="py-16 px-6 bg-indigo-600 text-white">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to Start?</h2>
          <p className="text-indigo-200 mb-8">Book your free trial today — no commitment required.</p>
          <TrialForm gymSlug={gym.slug} />
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 px-6 bg-gray-900 text-gray-300">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-400" />
            <p className="text-sm">{[address["street"], address["city"]].filter(Boolean).join(", ") || "See us in person"}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Phone className="h-5 w-5 text-indigo-400" />
            <a href={`tel:${gym.phone}`} className="text-sm hover:text-white">{gym.phone}</a>
          </div>
          {contact.hours && (
            <div className="flex flex-col items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              <p className="text-sm">{contact.hours}</p>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-gray-950 text-gray-500 py-4 text-center text-xs">
        © {new Date().getFullYear()} {gym.name}. Powered by <span className="text-indigo-400 font-medium">GrwFit</span>.
      </footer>
    </div>
  );
}
