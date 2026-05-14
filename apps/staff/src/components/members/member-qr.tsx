"use client";

import { useRef } from "react";
import { Button } from "@grwfit/ui";
import { Printer } from "lucide-react";

interface MemberQrProps {
  qrCode: string;
  memberName: string;
  memberId: string;
}

export function MemberQr({ qrCode, memberName, memberId }: MemberQrProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head>
        <title>QR - ${memberName}</title>
        <style>
          @page { size: 50mm 50mm; margin: 0; }
          body { margin: 0; display: flex; align-items: center; justify-content: center; height: 50mm; }
          .sticker { text-align: center; padding: 3mm; font-family: Arial, sans-serif; }
          .qr-placeholder { width: 36mm; height: 36mm; border: 1px solid #000; display: flex;
            align-items: center; justify-content: center; font-size: 8px; margin: 0 auto 2mm; }
          .name { font-size: 9px; font-weight: bold; overflow: hidden; white-space: nowrap; }
          .code { font-size: 7px; color: #555; }
        </style>
      </head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={printRef} className="sticker">
        {/* QR data URI would be rendered here via a library in production */}
        <div className="qr-placeholder border-2 border-foreground rounded p-2 w-36 h-36 flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-xs font-mono font-bold break-all leading-tight">{qrCode}</p>
          </div>
        </div>
        <p className="text-sm font-bold mt-1 max-w-[140px] truncate">{memberName}</p>
        <p className="text-xs text-muted-foreground font-mono">{memberId.slice(0, 8).toUpperCase()}</p>
      </div>

      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />
        Print 50mm Sticker
      </Button>
    </div>
  );
}
