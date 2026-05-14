"use client";

import { useState } from "react";
import { Dumbbell, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { useWorkoutPlan, useDietPlan } from "@/hooks/use-member";
import { format } from "date-fns";

const DAYS = [
  { key: "day1", label: "Mon" }, { key: "day2", label: "Tue" },
  { key: "day3", label: "Wed" }, { key: "day4", label: "Thu" },
  { key: "day5", label: "Fri" }, { key: "day6", label: "Sat" },
  { key: "day7", label: "Sun" },
];

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks",
};

export default function PlanPage() {
  const { data: workout, isLoading: workoutLoading } = useWorkoutPlan();
  const { data: diet, isLoading: dietLoading } = useDietPlan();

  const todayDayIdx = new Date().getDay(); // 0=Sun
  const todayKey = `day${todayDayIdx === 0 ? 7 : todayDayIdx}`;
  const [activeDay, setActiveDay] = useState(todayKey);
  const [activeTab, setActiveTab] = useState<"workout" | "diet">("workout");

  const exercises = workout?.week[activeDay] ?? [];
  const mealSlots = Object.entries(MEAL_LABELS);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">My Plan</h1>
        {workout && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {workout.name} · Updated {format(new Date(workout.updatedAt), "dd MMM")}
          </p>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex border-b">
        {[
          { key: "workout", label: "Workout", icon: Dumbbell },
          { key: "diet",    label: "Diet",    icon: Utensils },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as "workout" | "diet")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "workout" && (
        <>
          {/* Day selector */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {DAYS.map((d) => {
              const isToday = d.key === todayKey;
              const hasExercises = (workout?.week[d.key]?.length ?? 0) > 0;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setActiveDay(d.key)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-colors ${
                    activeDay === d.key
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{d.label}</span>
                  {isToday && <span className="text-[9px] mt-0.5">Today</span>}
                  {hasExercises && activeDay !== d.key && (
                    <span className="mt-1 h-1 w-1 rounded-full bg-current opacity-50" />
                  )}
                </button>
              );
            })}
          </div>

          {workoutLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : !workout ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No workout plan yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Ask your trainer to set it up.</p>
              </CardContent>
            </Card>
          ) : exercises.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-lg">🌟 Rest Day</p>
                <p className="text-sm text-muted-foreground mt-1">Recovery is part of the process.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3">
                  <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                  <p className="text-sm flex-1">{ex}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "diet" && (
        <>
          {dietLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : !diet ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Utensils className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No diet plan yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Ask your trainer to set it up.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {diet.calories && (
                <div className="flex gap-4 bg-primary/5 rounded-xl px-4 py-3">
                  <div className="text-center">
                    <p className="text-lg font-bold">{diet.calories}</p>
                    <p className="text-xs text-muted-foreground">kcal/day</p>
                  </div>
                  {diet.macros && (
                    <>
                      {[
                        { label: "Protein", value: diet.macros.protein, unit: "g" },
                        { label: "Carbs",   value: diet.macros.carbs,   unit: "g" },
                        { label: "Fat",     value: diet.macros.fat,     unit: "g" },
                      ].map((m) => (
                        <div key={m.label} className="text-center">
                          <p className="text-lg font-bold">{m.value}{m.unit}</p>
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {mealSlots.map(([slot, label]) => {
                  const items = (diet.meals[slot] ?? []) as string[];
                  if (!items.length) return null;
                  return (
                    <Card key={slot}>
                      <CardHeader className="pb-1 pt-3">
                        <CardTitle className="text-sm">{label}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <ul className="space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
