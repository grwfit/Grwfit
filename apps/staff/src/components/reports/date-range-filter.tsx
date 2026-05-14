"use client";

export type DatePreset = "today" | "7d" | "30d" | "mtd" | "qtd" | "ytd" | "custom";

const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d",    label: "7 days" },
  { key: "30d",   label: "30 days" },
  { key: "mtd",   label: "MTD" },
  { key: "qtd",   label: "QTD" },
  { key: "ytd",   label: "YTD" },
];

interface DateRangeFilterProps {
  preset: DatePreset;
  from?: string;
  to?: string;
  onPresetChange: (preset: DatePreset) => void;
  onCustomRange?: (from: string, to: string) => void;
  showCompare?: boolean;
  compareTo?: string;
  onCompareChange?: (v: string | undefined) => void;
  branchId?: string;
  onBranchChange?: (id: string | undefined) => void;
  branches?: Array<{ id: string; name: string }>;
}

export function DateRangeFilter({
  preset, from, to,
  onPresetChange, onCustomRange,
  showCompare, compareTo, onCompareChange,
  branchId, onBranchChange, branches,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset pills */}
      <div className="flex gap-1 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPresetChange(p.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              preset === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {onCustomRange && (
        <div className="flex gap-1 items-center">
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs bg-background"
            value={from ?? ""}
            onChange={(e) => {
              if (e.target.value && to) {
                onCustomRange(e.target.value, to);
                onPresetChange("custom");
              }
            }}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs bg-background"
            value={to ?? ""}
            onChange={(e) => {
              if (from && e.target.value) {
                onCustomRange(from, e.target.value);
                onPresetChange("custom");
              }
            }}
          />
        </div>
      )}

      {/* Branch selector */}
      {branches && branches.length > 0 && onBranchChange && (
        <select
          className="border rounded-md px-2 py-1 text-xs bg-background"
          value={branchId ?? ""}
          onChange={(e) => onBranchChange(e.target.value || undefined)}
        >
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}

      {/* Compare toggle */}
      {showCompare && onCompareChange && (
        <button
          type="button"
          onClick={() => onCompareChange(compareTo ? undefined : "prev_period")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            compareTo
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {compareTo ? "▲ Comparing" : "Compare"}
        </button>
      )}
    </div>
  );
}
