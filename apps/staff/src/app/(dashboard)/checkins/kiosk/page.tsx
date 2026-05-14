"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, LogIn, Search, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useLiveTicker, useTodayCheckins } from "@/hooks/use-checkins";
import type { CheckinResult, TickerEntry } from "@/hooks/use-checkins";
import { format } from "date-fns";

// Offline queue stored in localStorage
const OFFLINE_QUEUE_KEY = "grwfit_checkin_queue";

interface OfflineCheckin {
  memberId?: string;
  qrCode?: string;
  method: string;
  deviceId?: string;
  timestamp: string;
}

function useOfflineQueue(gymId: string | null) {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  const enqueue = useCallback(
    (item: Omit<OfflineCheckin, "timestamp">) => {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]";
      const queue = JSON.parse(raw) as OfflineCheckin[];
      queue.push({ ...item, timestamp: new Date().toISOString() });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    },
    [],
  );

  const flush = useCallback(async () => {
    if (!gymId) return;
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw) as OfflineCheckin[];
    if (!queue.length) return;

    const remaining: OfflineCheckin[] = [];
    for (const item of queue) {
      try {
        await apiClient.post(`/gyms/${gymId}/checkins`, {
          memberId: item.memberId,
          qrCode: item.qrCode,
          method: item.method,
          deviceId: item.deviceId,
        });
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }, [gymId]);

  return { enqueue, flush, isOnline };
}

type ResultState = CheckinResult | null;

export default function KioskPage() {
  const { gymId } = useAuth();
  const [result, setResult] = useState<ResultState>(null);
  const [search, setSearch] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: ticker } = useLiveTicker();
  const { data: today } = useTodayCheckins();
  const { enqueue, flush, isOnline } = useOfflineQueue(gymId);

  // Flush offline queue when coming back online
  useEffect(() => {
    const handleOnline = () => void flush();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flush]);

  // Auto-dismiss result after 4 seconds
  const showResult = useCallback((r: CheckinResult) => {
    setResult(r);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setResult(null);
      searchRef.current?.focus();
    }, 4000);
  }, []);

  // Play chime on success
  const playChime = useCallback((level: "ok" | "warn" | "block") => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = level === "ok" ? 880 : level === "warn" ? 440 : 220;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* audio may be blocked before user interaction */ }
  }, []);

  const performCheckin = useCallback(
    async (dto: { memberId?: string; qrCode?: string; phone?: string; method: string }) => {
      if (isProcessing || !gymId) return;
      setIsProcessing(true);
      try {
        const res = await apiClient.post<{ data: CheckinResult }>(`/gyms/${gymId}/checkins`, dto);
        const r = res.data.data;
        playChime(r.warningLevel);
        showResult(r);
      } catch {
        if (!isOnline) {
          enqueue({ ...dto, deviceId: "kiosk" });
          const offlineResult: CheckinResult = {
            success: true,
            memberId: dto.memberId ?? "",
            name: "Check-in queued",
            photoUrl: null,
            status: "active",
            expiresAt: null,
            daysLeft: null,
            message: "Saved offline — will sync when connected",
            warningLevel: "warn",
            checkedInAt: new Date().toISOString(),
          };
          showResult(offlineResult);
        } else {
          const errResult: CheckinResult = {
            success: false,
            memberId: "",
            name: "Error",
            photoUrl: null,
            status: "",
            expiresAt: null,
            daysLeft: null,
            message: "Member not found",
            warningLevel: "block",
            checkedInAt: new Date().toISOString(),
          };
          playChime("block");
          showResult(errResult);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [gymId, isOnline, isProcessing, enqueue, playChime, showResult],
  );

  // QR scanner init
  useEffect(() => {
    let scanner: { clear: () => void | Promise<void> } | null = null;

    const initScanner = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!scannerRef.current) return;

      const qr = new Html5Qrcode("qr-reader");
      html5QrRef.current = qr;

      try {
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          (decodedText) => {
            void performCheckin({ qrCode: decodedText, method: "qr" });
          },
          () => {}, // suppress scan errors
        );
        setScannerReady(true);
        scanner = qr;
      } catch {
        setScannerReady(false);
      }
    };

    void initScanner();

    return () => {
      if (scanner) try { void scanner.clear(); } catch { /* ignore */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !search.trim()) return;
    const val = search.trim();
    const isPhone = /^[6-9]\d{9}$/.test(val) || val.startsWith("+91");
    const phone = isPhone ? (val.startsWith("+91") ? val : `+91${val}`) : undefined;
    const memberId = !isPhone && val.length === 36 ? val : undefined;
    const qrCode = val.startsWith("GRW-") ? val : undefined;
    void performCheckin({ memberId, qrCode, phone, method: "manual" });
    setSearch("");
  };

  const bgClass =
    !result ? "bg-gray-900"
    : result.warningLevel === "ok" ? "bg-green-900"
    : result.warningLevel === "warn" ? "bg-yellow-900"
    : "bg-red-900";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${bgClass} text-white overflow-hidden`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/30">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-wide">GrwFit Kiosk</span>
          {isOnline
            ? <Wifi className="h-4 w-4 text-green-400" />
            : <WifiOff className="h-4 w-4 text-red-400" />}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold">{today?.total ?? 0}</p>
            <p className="text-xs text-white/60">Today</p>
          </div>
          {today?.peakHour !== null && today?.peakHour !== undefined && (
            <div className="text-center">
              <p className="text-lg font-bold">{today.peakHour}:00</p>
              <p className="text-xs text-white/60">Peak hour</p>
            </div>
          )}
          <span className="text-white/60">{format(new Date(), "h:mm a")}</span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scanner column */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
          {!result ? (
            <>
              {/* QR viewfinder */}
              <div className="relative">
                <div id="qr-reader" ref={scannerRef} className="w-72 h-72 rounded-2xl overflow-hidden bg-black/50" />
                {!scannerReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
                    <p className="text-sm text-white/60">Camera starting...</p>
                  </div>
                )}
                {/* Corner decorations */}
                {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-8 h-8 border-4 border-white/80 rounded-sm`}
                    style={{ borderRight: i % 2 === 0 ? "none" : undefined, borderLeft: i % 2 !== 0 ? "none" : undefined,
                      borderBottom: i < 2 ? "none" : undefined, borderTop: i >= 2 ? "none" : undefined }} />
                ))}
              </div>

              <p className="text-white/60 text-sm">Scan member QR card, or search below</p>

              {/* Manual search */}
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Phone number or Member ID..."
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 pl-10 text-white placeholder-white/40 focus:outline-none focus:border-white/60 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleManualSearch}
                  autoComplete="off"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-white/40" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Result display */
            <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
                {result.photoUrl ? (
                  <img src={result.photoUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold">{result.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="text-center">
                <p className="text-4xl font-bold">{result.name}</p>
                <p className="text-xl mt-2 text-white/80">{result.message}</p>
                {result.expiresAt && result.daysLeft !== null && result.daysLeft > 0 && (
                  <p className="text-sm mt-1 text-white/60">
                    {result.daysLeft} days remaining
                  </p>
                )}
              </div>

              {result.warningLevel === "ok" && (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-400">
                  <LogIn className="h-8 w-8 text-green-900" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live ticker column */}
        <div className="w-72 shrink-0 border-l border-white/10 flex flex-col bg-black/20">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-medium text-white/60">RECENT CHECK-INS</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(ticker ?? []).map((entry: TickerEntry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                  {entry.member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.member.name}</p>
                  <p className="text-xs text-white/40">
                    {format(new Date(entry.checkedInAt), "h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
