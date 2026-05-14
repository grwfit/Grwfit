"use client";

import { useState } from "react";
import { TrendingUp, Plus } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useProgress, useLogProgress } from "@/hooks/use-member";
import { format } from "date-fns";

export default function ProgressPage() {
  const { data: logs, isLoading } = useProgress();
  const logProgress = useLogProgress();
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const weightData = (logs ?? [])
    .filter((l) => l.weightGrams)
    .map((l) => ({
      date: l.loggedAt.substring(0, 10),
      kg: (l.weightGrams! / 1000).toFixed(1),
    }))
    .reverse();

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    logProgress.mutate(
      {
        weightGrams: weight ? Math.round(parseFloat(weight) * 1000) : undefined,
        notes: notes || undefined,
      },
      { onSuccess: () => { setShowForm(false); setWeight(""); setNotes(""); } },
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Progress</h1>
        <button
          type="button"
          onClick={() => setShowForm((p) => !p)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Log
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleLog} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="72.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How are you feeling?"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={logProgress.isPending}
                  className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium"
                >
                  {logProgress.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 border rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Weight chart */}
      {weightData.length > 1 && (
        <Card>
          <CardContent className="pt-4 pb-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Weight Trend (kg)</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => format(new Date(d), "dd MMM")} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  formatter={(v) => [`${v} kg`, "Weight"]}
                  labelFormatter={(d) => format(new Date(d), "dd MMM yyyy")}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line type="monotone" dataKey="kg" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Progress log entries */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : !logs?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No progress logged yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Tap Log to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {log.weightGrams && (
                    <span className="text-base font-bold">{(log.weightGrams / 1000).toFixed(1)} kg</span>
                  )}
                  {log.notes && <span className="text-sm text-muted-foreground truncate">{log.notes}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(log.loggedAt), "dd MMM yyyy, h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
