import { Dumbbell, MapPin, Phone, Star } from "lucide-react";
import { TrialForm } from "./trial-form";
import type { GymSiteData } from "@/lib/gym-data";

function paiseToRupees(p: number) { return `₹${(p / 100).toLocaleString("en-IN")}`; }
function daysToLabel(d: number) {
  if (d >= 365) return `${Math.round(d / 365)} Year`;
  if (d >= 30) return `${Math.round(d / 30)} Month`;
  return `${d} Days`;
}

export function ClassicTemplate({ data }: { data: GymSiteData }) {
  const { gym, plans, trainers } = data;
  const content = gym.website?.content ?? {};
  const hero = content.hero ?? {};
  const about = content.about ?? {};
  const address = gym.address as Record<string, string>;

  return (
    <div className="min-h-screen bg-white font-serif text-gray-800">
      {/* Header */}
      <header className="border-b py-4 px-6 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          {gym.logoUrl
            ? <img src={gym.logoUrl} alt={gym.name} className="h-10 object-contain" />
            : <Dumbbell className="h-8 w-8 text-gray-700" />
          }
          <span className="text-xl font-bold tracking-tight">{gym.name}</span>
        </div>
        <a href="#contact" className="text-sm border border-gray-700 px-4 py-1.5 rounded hover:bg-gray-50">
          Contact
        </a>
      </header>

      {/* Hero */}
      <section className="bg-gray-50 py-20 px-6 text-center border-b">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm tracking-widest text-gray-500 uppercase mb-4">Welcome to</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-snug">
            {hero.headline ?? gym.name}
          </h1>
          <p className="text-gray-600 text-lg mb-10">
            {hero.subheadline ?? "A trusted name in fitness since day one. Join our family."}
          </p>
          <div className="bg-white border rounded-2xl p-6 max-w-sm mx-auto shadow-sm">
            <p className="font-semibold text-gray-700 mb-4 text-sm">{hero.ctaText ?? "Book a Free Trial Session"}</p>
            <TrialForm gymSlug={gym.slug} />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl font-bold mb-4">{about.title ?? "Why Choose Us"}</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              {about.body ?? "We provide a welcoming environment for fitness enthusiasts of all levels."}
            </p>
            <ul className="space-y-2">
              {(about.features ?? ["Expert Trainers","Modern Equipment","Flexible Hours","Community Support"]).map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <Star className="h-4 w-4 text-amber-500 shrink-0" fill="currentColor" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {trainers.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Our Trainers</h2>
              <div className="space-y-3">
                {trainers.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 border-b pb-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">Certified Trainer</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Plans */}
      {plans.length > 0 && (
        <section className="py-16 px-6 bg-gray-50 border-y">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">Membership Plans</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Plan</th>
                    <th className="text-left py-3 px-4 font-semibold">Duration</th>
                    <th className="text-right py-3 px-4 font-semibold">Price</th>
                    <th className="text-right py-3 px-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {plans.map((plan, i) => (
                    <tr key={plan.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="py-4 px-4 font-medium">{plan.name}</td>
                      <td className="py-4 px-4 text-gray-600">{daysToLabel(plan.durationDays)}</td>
                      <td className="py-4 px-4 text-right font-bold">{paiseToRupees(plan.pricePaise)}</td>
                      <td className="py-4 px-4 text-right">
                        <a href="#contact" className="text-xs border border-gray-700 px-3 py-1 rounded hover:bg-gray-700 hover:text-white transition-colors">
                          Enquire
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Get in Touch</h2>
          <div className="space-y-4 text-gray-600 mb-10">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{[address["street"], address["city"], address["state"]].filter(Boolean).join(", ")}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone className="h-4 w-4" />
              <a href={`tel:${gym.phone}`} className="hover:underline">{gym.phone}</a>
            </div>
          </div>
          <TrialForm gymSlug={gym.slug} />
        </div>
      </section>

      <footer className="border-t py-5 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {gym.name}. Powered by <span className="font-medium text-gray-500">GrwFit</span>.
      </footer>
    </div>
  );
}
