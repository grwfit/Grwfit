"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, ListChecks, UserPlus, Upload, Dumbbell, CheckCircle, ChevronRight,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@grwfit/ui";
import { useOnboardingProgress, useCompleteStep } from "@/hooks/use-onboarding";

const STEPS = [
  { n: 1, icon: Building2, label: "Gym Profile",       desc: "Logo, address, GSTIN, hours" },
  { n: 2, icon: ListChecks, label: "Membership Plans", desc: "Customize your plan pricing" },
  { n: 3, icon: UserPlus,   label: "Add Trainers",     desc: "Invite your team via WhatsApp" },
  { n: 4, icon: Upload,     label: "Import Members",   desc: "Upload CSV or skip for now" },
  { n: 5, icon: Dumbbell,   label: "First Check-in",  desc: "Try the check-in flow" },
];

// ── Step components ────────────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  const complete = useCompleteStep();
  const [form, setForm] = useState({ gstNo: "", timezone: "Asia/Kolkata", city: "", state: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    complete.mutate(
      { step: 1, data: { address: { city: form.city, state: form.state }, gstNo: form.gstNo || undefined, timezone: form.timezone } },
      { onSuccess: onNext },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <Input value={form.city} onChange={set("city")} placeholder="Mumbai" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <Input value={form.state} onChange={set("state")} placeholder="Maharashtra" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">GSTIN (optional)</label>
        <Input value={form.gstNo} onChange={set("gstNo")} placeholder="27AABCU9603R1ZX" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Timezone</label>
        <select value={form.timezone} onChange={set("timezone")} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
          <option value="Asia/Kolkata">IST — Asia/Kolkata</option>
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={complete.isPending}>
        {complete.isPending ? "Saving..." : "Save & Continue →"}
      </Button>
    </form>
  );
}

function Step2({ onNext }: { onNext: () => void }) {
  const complete = useCompleteStep();
  const [plans, setPlans] = useState([
    { name: "Monthly", pricePaise: 150000, durationDays: 30 },
    { name: "Quarterly", pricePaise: 400000, durationDays: 90 },
    { name: "Annual", pricePaise: 1200000, durationDays: 365 },
  ]);

  const updatePlan = (i: number, field: string, value: string) => {
    setPlans((prev) => prev.map((p, idx) => idx === i
      ? { ...p, [field]: field === "pricePaise" ? Math.round(parseFloat(value) * 100) : p[field as keyof typeof p] }
      : p
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    complete.mutate({ step: 2, data: { plans } }, { onSuccess: onNext });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Adjust pricing to match your gym. You can always change this later.</p>
      {plans.map((plan, i) => (
        <div key={plan.name} className="flex items-center gap-3 border rounded-lg px-4 py-3">
          <span className="font-medium w-24 text-sm">{plan.name}</span>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              defaultValue={(plan.pricePaise / 100).toString()}
              onChange={(e) => updatePlan(i, "pricePaise", e.target.value)}
              className="w-28"
            />
          </div>
          <span className="text-xs text-muted-foreground">{plan.durationDays}d</span>
        </div>
      ))}
      <Button type="submit" className="w-full" disabled={complete.isPending}>
        {complete.isPending ? "Saving..." : "Save Plans & Continue →"}
      </Button>
    </form>
  );
}

function Step3({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const complete = useCompleteStep();
  const [trainers, setTrainers] = useState([{ name: "", phone: "" }]);

  const addTrainer = () => setTrainers((p) => [...p, { name: "", phone: "" }]);
  const updateTrainer = (i: number, k: string, v: string) =>
    setTrainers((p) => p.map((t, idx) => idx === i ? { ...t, [k]: v } : t));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = trainers.filter((t) => t.name && t.phone);
    if (!valid.length) { onSkip(); return; }
    complete.mutate({ step: 3, data: { trainers: valid } }, { onSuccess: onNext });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Add your trainers — they'll receive a WhatsApp invite to log in.</p>
      {trainers.map((t, i) => (
        <div key={i} className="grid grid-cols-2 gap-3">
          <Input value={t.name} onChange={(e) => updateTrainer(i, "name", e.target.value)} placeholder="Trainer name" />
          <Input value={t.phone} onChange={(e) => updateTrainer(i, "phone", e.target.value)} placeholder="9XXXXXXXXX" />
        </div>
      ))}
      <button type="button" onClick={addTrainer} className="text-sm text-primary hover:underline">+ Add another trainer</button>
      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={complete.isPending}>
          {complete.isPending ? "Sending invites..." : "Send WhatsApp Invites →"}
        </Button>
        <Button type="button" variant="outline" onClick={onSkip}>Skip</Button>
      </div>
    </form>
  );
}

function Step4({ onSkip }: { onNext: () => void; onSkip: () => void }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Import your existing members from a spreadsheet, or start fresh.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button onClick={() => { router.push("/members?import=1"); }} variant="outline" className="h-20 flex-col">
          <Upload className="h-5 w-5 mb-1" />
          Upload CSV
        </Button>
        <Button variant="outline" className="h-20 flex-col" onClick={onSkip}>
          <span className="text-lg mb-1">→</span>
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function Step5({ onNext: _onNext }: { onNext: () => void }) {
  const complete = useCompleteStep();
  const router = useRouter();

  const handleDone = () => {
    complete.mutate({ step: 5 }, { onSuccess: () => router.replace("/dashboard") });
  };

  return (
    <div className="space-y-4 text-center">
      <div className="bg-primary/5 rounded-xl p-6">
        <Dumbbell className="h-12 w-12 text-primary mx-auto mb-3" />
        <p className="font-semibold">Try your first check-in!</p>
        <p className="text-sm text-muted-foreground mt-1">Head to Check-ins → Kiosk Mode and scan a member's QR code.</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => router.push("/checkins/kiosk")} variant="outline" className="flex-1">
          Open Kiosk Mode
        </Button>
        <Button onClick={handleDone} className="flex-1" disabled={complete.isPending}>
          {complete.isPending ? "..." : "Done! Go to Dashboard →"}
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard page ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { data: progress, isLoading } = useOnboardingProgress();
  const complete = useCompleteStep();

  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (progress) setActiveStep(progress.currentStep);
  }, [progress?.currentStep]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const completedSet = new Set(progress?.completedSteps ?? []);
  const gymName = progress?.gym?.name ?? "Your Gym";
  const daysLeft = progress?.daysLeft;

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center">
          <Dumbbell className="h-8 w-8 text-primary mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Welcome to GrwFit, {gymName}!</h1>
          {daysLeft !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              {daysLeft} days remaining in your free trial
            </p>
          )}
        </div>

        {/* Steps sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            {STEPS.map(({ n, icon: Icon, label }) => (
              <button
                key={n}
                type="button"
                onClick={() => setActiveStep(n)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  activeStep === n ? "bg-primary text-primary-foreground"
                  : completedSet.has(n) ? "bg-green-50 dark:bg-green-950/30 text-green-700"
                  : "bg-card hover:bg-muted/50"
                }`}
              >
                {completedSet.has(n) ? <CheckCircle className="h-4 w-4 shrink-0" /> : <Icon className="h-4 w-4 shrink-0" />}
                <span className="font-medium">{label}</span>
                {activeStep === n && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            ))}
          </div>

          {/* Active step content */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{STEPS[activeStep - 1]?.label}</CardTitle>
              <p className="text-xs text-muted-foreground">{STEPS[activeStep - 1]?.desc}</p>
            </CardHeader>
            <CardContent>
              {activeStep === 1 && <Step1 onNext={() => setActiveStep(2)} />}
              {activeStep === 2 && <Step2 onNext={() => setActiveStep(3)} />}
              {activeStep === 3 && (
                <Step3
                  onNext={() => setActiveStep(4)}
                  onSkip={() => { complete.mutate({ step: "4/skip" }); setActiveStep(4); }}
                />
              )}
              {activeStep === 4 && (
                <Step4
                  onNext={() => setActiveStep(5)}
                  onSkip={() => { complete.mutate({ step: "4/skip" }); setActiveStep(5); }}
                />
              )}
              {activeStep === 5 && <Step5 onNext={() => router.replace("/dashboard")} />}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Progress is saved automatically — you can resume anytime.{" "}
          <button type="button" onClick={() => router.replace("/dashboard")} className="text-primary hover:underline">
            Skip to dashboard →
          </button>
        </p>
      </div>
    </div>
  );
}
