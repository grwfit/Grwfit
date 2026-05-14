"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Users, Clock, X } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import {
  useClassTemplates, useClassInstances, useCreateTemplate, useCreateInstance, useCancelInstance,
} from "@/hooks/use-classes";
import { format, addDays } from "date-fns";

const DOW_MAP: Record<string, string> = { MO:"Mon",TU:"Tue",WE:"Wed",TH:"Thu",FR:"Fri",SA:"Sat",SU:"Sun" };

function parseRRule(rule: string | null): string {
  if (!rule) return "One-off";
  const params = Object.fromEntries(rule.split(";").map((p) => p.split("=")));
  const days = (params["BYDAY"] ?? "").split(",").map((d: string) => DOW_MAP[d] ?? d).join(", ");
  const hour = params["BYHOUR"] ?? "7";
  return `Weekly: ${days} at ${hour}:00`;
}

export default function ClassesPage() {
  const router = useRouter();
  const { data: templates } = useClassTemplates();
  const { data: instances, isLoading } = useClassInstances({ to: addDays(new Date(), 14).toISOString() });
  const createTemplate = useCreateTemplate();
  const createInstance = useCreateInstance();
  const cancelInstance = useCancelInstance();

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", capacity: "20", durationMin: "60" });
  const [schedForm, setSchedForm] = useState({ templateId: "", startsAt: "" });

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplate.mutate(
      { name: tplForm.name, capacity: parseInt(tplForm.capacity), durationMin: parseInt(tplForm.durationMin) },
      { onSuccess: () => { setShowTemplateForm(false); setTplForm({ name: "", capacity: "20", durationMin: "60" }); } },
    );
  };

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    createInstance.mutate(
      { templateId: schedForm.templateId, startsAt: new Date(schedForm.startsAt).toISOString() },
      { onSuccess: () => { setShowScheduleForm(false); setSchedForm({ templateId: "", startsAt: "" }); } },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Booking</h1>
          <p className="text-muted-foreground mt-1">Pro Tier — manage class schedules and rosters</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Template
          </Button>
          <Button onClick={() => setShowScheduleForm(true)} disabled={!templates?.length}>
            <Calendar className="h-4 w-4 mr-1.5" /> Schedule Class
          </Button>
        </div>
      </div>

      {/* Template form */}
      {showTemplateForm && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Class Template</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTemplate} className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input required value={tplForm.name} onChange={(e) => setTplForm(p => ({ ...p, name: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm bg-background w-40" placeholder="Zumba, Yoga..." />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Capacity</label>
                <input type="number" required value={tplForm.capacity} onChange={(e) => setTplForm(p => ({ ...p, capacity: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm bg-background w-20" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Duration (min)</label>
                <input type="number" required value={tplForm.durationMin} onChange={(e) => setTplForm(p => ({ ...p, durationMin: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm bg-background w-20" />
              </div>
              <Button type="submit" size="sm" disabled={createTemplate.isPending}>Create</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowTemplateForm(false)}>Cancel</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Schedule form */}
      {showScheduleForm && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Schedule a Class</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSchedule} className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs font-medium mb-1">Template</label>
                <select required value={schedForm.templateId} onChange={(e) => setSchedForm(p => ({ ...p, templateId: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm bg-background">
                  <option value="">Select...</option>
                  {(templates ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date & Time</label>
                <input type="datetime-local" required value={schedForm.startsAt} onChange={(e) => setSchedForm(p => ({ ...p, startsAt: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm bg-background" />
              </div>
              <Button type="submit" size="sm" disabled={createInstance.isPending}>Schedule</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowScheduleForm(false)}>Cancel</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Templates */}
      {(templates?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates?.map((t) => (
              <Card key={t.id}>
                <CardContent className="pt-4 pb-4">
                  <p className="font-medium">{t.name}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{t.capacity}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.durationMin}min</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{parseRRule(t.recurrenceRule)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming instances */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Next 14 Days
        </h2>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : !instances?.length ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No classes scheduled. Schedule one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {instances.map((inst) => (
              <div key={inst.id} className="flex items-center gap-4 bg-card border rounded-xl px-4 py-3 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/classes/${inst.id}`)}>
                <div className="text-center w-14 shrink-0">
                  <p className="text-xs text-muted-foreground">{format(new Date(inst.startsAt), "EEE")}</p>
                  <p className="font-bold">{format(new Date(inst.startsAt), "dd MMM")}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(inst.startsAt), "HH:mm")}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{inst.template.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{inst._count.bookings}/{inst.capacity} booked</span>
                    {inst._count.waitlist > 0 && <span className="text-orange-500">{inst._count.waitlist} waitlisted</span>}
                    <span>{inst.template.durationMin}min</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, (inst._count.bookings / inst.capacity) * 100)}%` }} />
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); cancelInstance.mutate(inst.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
