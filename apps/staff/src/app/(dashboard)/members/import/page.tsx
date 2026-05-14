"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Download } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@grwfit/ui";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type Step = "upload" | "preview" | "importing" | "done";

interface PreviewData {
  preview: Array<{ name: string; phone: string; email?: string; gender?: string }>;
  total: number;
  valid: number;
  errors: Array<{ row: number; phone?: string; error: string }>;
}

interface ImportResult {
  jobId?: string;
  imported?: number;
  errors?: Array<{ row: number; error: string }>;
}

export default function ImportMembersPage() {
  const router = useRouter();
  const { gymId } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".csv") && !f.name.endsWith(".xlsx")) {
      toast.error("Only CSV files are supported");
      return;
    }
    setFile(f);
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await apiClient.post<{ data: PreviewData }>(
        `/gyms/${gymId}/members/import/preview`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setPreview(res.data.data);
      setStep("preview");
    } catch {
      toast.error("Failed to parse CSV. Make sure it has 'name' and 'phone' columns.");
    } finally {
      setIsLoading(false);
    }
  }, [gymId]);

  const handleCommit = async () => {
    if (!file) return;
    setIsLoading(true);
    setStep("importing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiClient.post<{ data: ImportResult }>(
        `/gyms/${gymId}/members/import/commit`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const data = res.data.data;
      setResult(data);

      if (data.jobId) {
        setJobId(data.jobId);
        pollJob(data.jobId);
      } else {
        setStep("done");
      }
    } catch {
      toast.error("Import failed");
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  };

  const pollJob = (jid: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get<{ data: { status: string; processed: number; total: number; succeeded: number; failed: number } }>(
          `/gyms/${gymId}/members/import/${jid}/status`,
        );
        const job = res.data.data;
        setJobProgress(Math.round((job.processed / job.total) * 100));
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(interval);
          setResult({ imported: job.succeeded, errors: [] });
          setStep("done");
          toast[job.status === "completed" ? "success" : "error"](
            job.status === "completed"
              ? `Import complete: ${job.succeeded} members added`
              : "Import failed",
          );
        }
      } catch { clearInterval(interval); }
    }, 2000);
  };

  const downloadTemplate = () => {
    const csv = "name,phone,email,gender,dob\nAjit Kumar,9876543210,ajit@example.com,male,1990-01-15";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "members-import-template.csv";
    a.click();
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Import Members</h1>
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) void handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Drop CSV here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Max 5MB · CSV format</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />

            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Required columns: <strong>name</strong>, <strong>phone</strong></p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1.5" /> Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview step */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold">{preview.total}</p><p className="text-xs text-muted-foreground">Total rows</p></div>
                <div><p className="text-2xl font-bold text-green-600">{preview.valid}</p><p className="text-xs text-muted-foreground">Valid</p></div>
                <div><p className="text-2xl font-bold text-destructive">{preview.errors.length}</p><p className="text-xs text-muted-foreground">Errors</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Preview (first 10 rows)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Name</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Phone</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Email</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Gender</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {preview.preview.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.phone}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.gender ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {preview.errors.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertCircle className="h-4 w-4" /> {preview.errors.length} rows will be skipped
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {preview.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-xs text-orange-700 dark:text-orange-300">
                      Row {e.row}: {e.error}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button onClick={() => void handleCommit()} loading={isLoading} disabled={preview.valid === 0} className="flex-1">
              Import {preview.valid} Members
              {preview.valid > 100 && " (background job)"}
            </Button>
            <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setPreview(null); }}>
              Change File
            </Button>
          </div>
        </div>
      )}

      {/* Importing step */}
      {step === "importing" && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="font-medium">Importing members...</p>
            {jobId && (
              <div className="w-full max-w-sm mx-auto">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${jobProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{jobProgress}% complete</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Done step */}
      {step === "done" && result && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-xl font-bold">{result.imported} members imported</p>
              {(result.errors?.length ?? 0) > 0 && (
                <p className="text-sm text-muted-foreground mt-1">{result.errors?.length} rows skipped</p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/members")}>View Members</Button>
              <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setPreview(null); setResult(null); setJobId(null); }}>
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
