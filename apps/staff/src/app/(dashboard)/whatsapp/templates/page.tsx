"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Send, CheckCircle, Clock, XCircle, MessageSquare,
} from "lucide-react";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Badge, Input,
} from "@grwfit/ui";
import {
  useWhatsappTemplates, useCreateTemplate, useUpdateTemplate,
  useDeleteTemplate, useTestSendTemplate,
} from "@/hooks/use-whatsapp";
import type { WhatsappTemplate } from "@/hooks/use-whatsapp";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  approved: { label: "Approved", icon: CheckCircle, className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  pending:  { label: "Pending",  icon: Clock,        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  rejected: { label: "Rejected", icon: XCircle,      className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
} as const;

function StatusBadge({ status }: { status: WhatsappTemplate["status"] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

// ── Template form ─────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  metaTemplateId: string;
  body: string;
  variablesRaw: string; // comma-separated variable keys
  category: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  metaTemplateId: "",
  body: "",
  variablesRaw: "",
  category: "UTILITY",
};

function TemplateForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: WhatsappTemplate;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          metaTemplateId: initial.metaTemplateId ?? "",
          body: initial.body,
          variablesRaw: initial.variables.join(", "),
          category: initial.category,
        }
      : EMPTY_FORM,
  );

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Template Name</label>
          <Input value={form.name} onChange={set("name")} placeholder="e.g. renewal_reminder_7d" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Meta Template ID</label>
          <Input value={form.metaTemplateId} onChange={set("metaTemplateId")} placeholder="From WhatsApp Business Manager" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Body</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm resize-none min-h-[100px] bg-background"
          value={form.body}
          onChange={set("body")}
          placeholder="Hi {{1}}, your membership expires in {{2}} days..."
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Use {"{{1}}"}, {"{{2}}"} etc. for variables</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Variable Keys (comma-separated)</label>
          <Input value={form.variablesRaw} onChange={set("variablesRaw")} placeholder="name, expires_at" />
          <p className="text-xs text-muted-foreground mt-1">Maps to {"{{1}}"}, {"{{2}}"} in order</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={form.category}
            onChange={set("category")}
          >
            <option value="UTILITY">Utility (~₹0.15)</option>
            <option value="MARKETING">Marketing (~₹0.90)</option>
            <option value="AUTHENTICATION">Authentication</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initial ? "Update Template" : "Create Template"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Test send dialog ──────────────────────────────────────────────────────────

function TestSendPanel({ template, onClose }: { template: WhatsappTemplate; onClose: () => void }) {
  const [phone, setPhone] = useState("+91");
  const [vars, setVars] = useState<string[]>(template.variables.map(() => ""));
  const testSend = useTestSendTemplate();

  const handleSend = () => {
    testSend.mutate(
      { id: template.id, phone, variables: vars },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
      <h4 className="font-medium text-sm">Test Send — {template.name}</h4>
      <div>
        <label className="block text-xs font-medium mb-1">Phone</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999999" />
      </div>
      {template.variables.map((key, i) => (
        <div key={key}>
          <label className="block text-xs font-medium mb-1">{"{{" + (i + 1) + "}}"} — {key}</label>
          <Input
            value={vars[i] ?? ""}
            onChange={(e) => setVars((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
            placeholder={`Value for ${key}`}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSend} disabled={testSend.isPending}>
          {testSend.isPending ? "Sending..." : "Send Test"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { data: templates, isLoading } = useWhatsappTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testSendId, setTestSendId] = useState<string | null>(null);

  const handleCreate = (form: FormState) => {
    createTemplate.mutate(
      {
        name: form.name,
        metaTemplateId: form.metaTemplateId || undefined,
        body: form.body,
        variables: form.variablesRaw.split(",").map((s) => s.trim()).filter(Boolean),
        category: form.category,
      },
      { onSuccess: () => setShowCreate(false) },
    );
  };

  const handleUpdate = (id: string, form: FormState) => {
    updateTemplate.mutate(
      {
        id,
        name: form.name,
        metaTemplateId: form.metaTemplateId || undefined,
        body: form.body,
        variables: form.variablesRaw.split(",").map((s) => s.trim()).filter(Boolean),
      },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Templates</h1>
          <p className="text-muted-foreground mt-1">Manage Meta-approved templates for automated messages</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Template</CardTitle></CardHeader>
          <CardContent>
            <TemplateForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              loading={createTemplate.isPending}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 pt-6" />
            </Card>
          ))}
        </div>
      ) : !templates?.length ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No templates yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="pt-4 pb-4">
                {editingId === tpl.id ? (
                  <TemplateForm
                    initial={tpl}
                    onSubmit={(form) => handleUpdate(tpl.id, form)}
                    onCancel={() => setEditingId(null)}
                    loading={updateTemplate.isPending}
                  />
                ) : testSendId === tpl.id ? (
                  <TestSendPanel template={tpl} onClose={() => setTestSendId(null)} />
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{tpl.name}</span>
                        <StatusBadge status={tpl.status} />
                        <Badge variant="outline" className="text-xs">{tpl.category}</Badge>
                      </div>
                      {tpl.metaTemplateId && (
                        <p className="text-xs text-muted-foreground mt-0.5">ID: {tpl.metaTemplateId}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{tpl.body}</p>
                      {tpl.variables.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {tpl.variables.map((v, i) => (
                            <span key={v} className="text-xs bg-muted rounded px-1.5 py-0.5">
                              {"{{" + (i + 1) + "}}"} = {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {tpl.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => setTestSendId(tpl.id)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Test
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(tpl.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteTemplate.mutate(tpl.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
