"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell, Utensils, TrendingUp, Plus, Save } from "lucide-react";
import { Button, Card, CardContent } from "@grwfit/ui";
import {
  useTrainersList, useWorkoutPlan, useCreateWorkoutPlan,
  useDietPlan, useCreateDietPlan, useProgressLogs, useLogProgress,
} from "@/hooks/use-trainers";
import { format } from "date-fns";

const DAYS = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"] as const;
const DAY_LABELS: Record<string, string> = {
  day1: "Mon", day2: "Tue", day3: "Wed", day4: "Thu",
  day5: "Fri", day6: "Sat", day7: "Sun (Rest)",
};

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snacks"] as const;

// ── Workout plan builder ──────────────────────────────────────────────────────

function WorkoutPlanBuilder({ memberId }: { memberId: string }) {
  const { data: existing } = useWorkoutPlan(memberId);
  const createPlan = useCreateWorkoutPlan();

  const [planName, setPlanName] = useState("Weekly Plan");
  const [activeDay, setActiveDay] = useState("day1");
  const [week, setWeek] = useState<Record<string, string[]>>(
    DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {}),
  );
  const [newExercise, setNewExercise] = useState("");

  const addExercise = () => {
    if (!newExercise.trim()) return;
    setWeek((prev) => ({ ...prev, [activeDay]: [...(prev[activeDay] ?? []), newExercise.trim()] }));
    setNewExercise("");
  };

  const removeExercise = (day: string, idx: number) => {
    setWeek((prev) => ({ ...prev, [day]: (prev[day] ?? []).filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    createPlan.mutate({
      memberId,
      name: planName,
      week: Object.fromEntries(Object.entries(week).map(([d, exs]) => [d, exs])) as Record<string, unknown[]>,
    });
  };

  const currentExercises = week[activeDay] ?? [];

  return (
    <div className="space-y-4">
      {existing && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
          Active plan: <strong>{existing.name}</strong> — last updated {format(new Date(existing.updatedAt), "dd MMM yyyy")}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          className="border rounded-md px-3 py-1.5 text-sm bg-background flex-1 max-w-xs"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="Plan name"
        />
        <Button size="sm" onClick={handleSave} disabled={createPlan.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" /> {createPlan.isPending ? "Saving..." : "Save Plan"}
        </Button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 flex-wrap">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setActiveDay(d)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeDay === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {DAY_LABELS[d]}
            {(week[d]?.length ?? 0) > 0 && (
              <span className="ml-1 opacity-70">({week[d]?.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Exercise editor */}
      <div className="border rounded-lg p-3 space-y-2 min-h-[140px]">
        {currentExercises.length === 0 && (
          <p className="text-xs text-muted-foreground">No exercises for {DAY_LABELS[activeDay]}. Add below or mark as rest day.</p>
        )}
        {currentExercises.map((ex, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
            <span className="flex-1">{ex}</span>
            <button type="button" onClick={() => removeExercise(activeDay, i)}
              className="text-muted-foreground hover:text-destructive text-xs">✕</button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input
            className="flex-1 border rounded px-2 py-1 text-sm bg-background"
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExercise())}
            placeholder="e.g. Bench Press 3×10 @ 60kg"
          />
          <Button size="sm" variant="outline" onClick={addExercise} disabled={!newExercise.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Diet plan builder ─────────────────────────────────────────────────────────

function DietPlanBuilder({ memberId }: { memberId: string }) {
  const { data: existing } = useDietPlan(memberId);
  const createDiet = useCreateDietPlan();

  const [meals, setMeals] = useState<Record<string, string[]>>(
    MEAL_SLOTS.reduce((acc, s) => ({ ...acc, [s]: [] }), {}),
  );
  const [calories, setCalories] = useState("");
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  const addItem = (slot: string) => {
    const item = newItem[slot]?.trim();
    if (!item) return;
    setMeals((prev) => ({ ...prev, [slot]: [...(prev[slot] ?? []), item] }));
    setNewItem((prev) => ({ ...prev, [slot]: "" }));
  };

  const removeItem = (slot: string, idx: number) => {
    setMeals((prev) => ({ ...prev, [slot]: (prev[slot] ?? []).filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    createDiet.mutate({
      memberId,
      meals: Object.fromEntries(Object.entries(meals).map(([k, v]) => [k, v])) as Record<string, unknown[]>,
      calories: calories ? parseInt(calories, 10) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {existing && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
          Active diet plan — last updated {format(new Date(existing.updatedAt), "dd MMM yyyy")}
          {existing.calories && <span> · {existing.calories} kcal/day</span>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="number"
          className="border rounded-md px-3 py-1.5 text-sm bg-background w-32"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Daily kcal"
        />
        <Button size="sm" onClick={handleSave} disabled={createDiet.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" /> {createDiet.isPending ? "Saving..." : "Save Diet Plan"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MEAL_SLOTS.map((slot) => (
          <div key={slot} className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium capitalize">{slot}</p>
            {(meals[slot] ?? []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-muted-foreground">• {item}</span>
                <button type="button" onClick={() => removeItem(slot, i)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
              </div>
            ))}
            <div className="flex gap-1">
              <input
                className="flex-1 border rounded px-2 py-1 text-xs bg-background"
                value={newItem[slot] ?? ""}
                onChange={(e) => setNewItem((p) => ({ ...p, [slot]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem(slot))}
                placeholder="Add item (Hindi/English)..."
              />
              <button type="button" onClick={() => addItem(slot)}
                className="px-2 py-1 border rounded text-xs hover:bg-muted">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Progress tab ──────────────────────────────────────────────────────────────

function ProgressTab({ memberId }: { memberId: string }) {
  const { data: logs } = useProgressLogs(memberId);
  const logProgress = useLogProgress();
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    logProgress.mutate({
      memberId,
      weightGrams: weight ? Math.round(parseFloat(weight) * 1000) : undefined,
      notes: notes || undefined,
    });
    setWeight(""); setNotes("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleLog} className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium mb-1">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            className="border rounded-md px-3 py-1.5 text-sm bg-background w-28"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="72.5"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium mb-1">Notes</label>
          <input
            className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Energy good, form improving..."
          />
        </div>
        <Button type="submit" size="sm" disabled={logProgress.isPending}>Log Progress</Button>
      </form>

      {(logs?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No progress logs yet.</p>
      ) : (
        <div className="space-y-2">
          {logs?.map((log) => (
            <div key={log.id} className="flex items-center gap-4 border rounded-lg px-4 py-3">
              <div className="text-center w-16">
                {log.weightGrams ? (
                  <>
                    <p className="font-bold text-sm">{(log.weightGrams / 1000).toFixed(1)} kg</p>
                    <p className="text-xs text-muted-foreground">Weight</p>
                  </>
                ) : <span className="text-xs text-muted-foreground">No weight</span>}
              </div>
              <div className="flex-1 min-w-0">
                {log.notes && <p className="text-sm">{log.notes}</p>}
                <p className="text-xs text-muted-foreground">{format(new Date(log.loggedAt), "dd MMM yyyy")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrainerPlansPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: trainers } = useTrainersList();
  const trainer = trainers?.find((t) => t.id === params.id);

  // Use first assigned member for demo; in real flow: member picker
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workout" | "diet" | "progress">("workout");

  const TABS = [
    { key: "workout", label: "Workout Plan", icon: Dumbbell },
    { key: "diet",    label: "Diet Plan",    icon: Utensils },
    { key: "progress",label: "Progress",      icon: TrendingUp },
  ] as const;

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{trainer?.name ?? "Trainer"}</h1>
          <p className="text-sm text-muted-foreground">{trainer?.memberCount ?? "—"} assigned members</p>
        </div>
      </div>

      {/* Member picker */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <label className="block text-sm font-medium mb-2">Select Member</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="Paste member UUID to load their plans..."
            value={selectedMemberId ?? ""}
            onChange={(e) => setSelectedMemberId(e.target.value || null)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tip: Click a member from <a href="/members" className="text-primary hover:underline">Members</a> and copy the ID.
          </p>
        </CardContent>
      </Card>

      {selectedMemberId && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="pt-5 pb-5">
              {activeTab === "workout" && (
                <WorkoutPlanBuilder memberId={selectedMemberId} />
              )}
              {activeTab === "diet" && (
                <DietPlanBuilder memberId={selectedMemberId} />
              )}
              {activeTab === "progress" && (
                <ProgressTab memberId={selectedMemberId} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
