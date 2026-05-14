import { MapPin, Phone, Zap } from "lucide-react";
import { TrialForm } from "./trial-form";
import type { GymSiteData } from "@/lib/gym-data";

function paiseToRupees(p: number) { return `₹${(p / 100).toLocaleString("en-IN")}`; }
function daysToLabel(days: number) {
  if (days >= 365) return `${Math.round(days / 365)}yr`;
  if (days >= 30) return `${Math.round(days / 30)}mo`;
  return `${days}d`;
}

export function BoldTemplate({ data }: { data: GymSiteData }) {
  const { gym, plans, trainers } = data;
  const content = gym.website?.content ?? {};
  const hero = content.hero ?? {};
  const about = content.about ?? {};
  const address = gym.address as Record<string, string>;

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Hero — dark, high-contrast */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "linear-gradient(135deg, #000 0%, #111 50%, #1a0a2e 100%)" }}
      >
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "30px 30px" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-1 w-8 bg-yellow-400" />
            <Zap className="h-6 w-6 text-yellow-400" />
            <div className="h-1 w-8 bg-yellow-400" />
          </div>
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tight mb-6 leading-none">
            {hero.headline ?? <>FORGE YOUR<br /><span className="text-yellow-400">STRENGTH</span></>}
          </h1>
          <p className="text-gray-400 text-lg mb-10">{hero.subheadline ?? "No excuses. Just results."}</p>
          <div className="max-w-sm mx-auto bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-yellow-400 font-bold uppercase tracking-widest text-sm mb-4">
              {hero.ctaText ?? "Free Trial"}
            </p>
            <TrialForm gymSlug={gym.slug} />
          </div>
        </div>
      </section>

      {/* Plans */}
      {plans.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black uppercase text-center mb-12">
              <span className="text-yellow-400">CHOOSE</span> YOUR PLAN
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, i) => (
                <div key={plan.id} className={`border rounded-xl p-6 ${i === 1 ? "border-yellow-400 bg-yellow-400/5" : "border-gray-800"}`}>
                  <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">{daysToLabel(plan.durationDays)}</p>
                  <p className="text-3xl font-black mb-1">{paiseToRupees(plan.pricePaise)}</p>
                  <p className="text-lg font-bold text-gray-300 mb-6">{plan.name}</p>
                  <a href="#" className={`block text-center py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide ${i === 1 ? "bg-yellow-400 text-black" : "border border-gray-600 text-white hover:border-yellow-400 transition-colors"}`}>
                    Get Started
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      <section className="py-16 px-6 bg-gray-950">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-yellow-400 uppercase tracking-widest text-xs mb-3">About Us</p>
            <h2 className="text-3xl font-black mb-4">{about.title ?? gym.name}</h2>
            <p className="text-gray-400">{about.body ?? "We build champions. Join us."}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(about.features ?? ["Certified Trainers","Pro Equipment","24/7 Access","Results Guaranteed"]).map((f) => (
              <div key={f} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm font-medium">
                <Zap className="h-4 w-4 text-yellow-400 mb-2" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers */}
      {trainers.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black uppercase text-center mb-10">Our <span className="text-yellow-400">Coaches</span></h2>
            <div className="flex flex-wrap justify-center gap-4">
              {trainers.map((t) => (
                <div key={t.id} className="border border-gray-800 rounded-xl px-6 py-4 text-center bg-gray-950 min-w-[120px]">
                  <div className="h-14 w-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-2 text-xl font-black text-yellow-400">
                    {t.name.charAt(0)}
                  </div>
                  <p className="font-bold text-sm">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-6 justify-between items-center text-sm text-gray-500">
          <p className="font-black text-white text-lg">{gym.name}</p>
          <div className="flex gap-6">
            {gym.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{gym.phone}</span>}
            {address["city"] && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{address["city"]}</span>}
          </div>
          <p className="text-xs">Powered by <span className="text-yellow-400">GrwFit</span></p>
        </div>
      </footer>
    </div>
  );
}
