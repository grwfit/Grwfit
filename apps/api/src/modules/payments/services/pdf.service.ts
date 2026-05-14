import { Injectable, Logger } from "@nestjs/common";
import type { GstBreakdown } from "./invoice.service";

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  gymGstin: string | null;
  memberName: string;
  memberPhone: string;
  planName: string;
  gst: GstBreakdown;
  paymentMode: string;
  txnRef: string | null;
  isCreditNote?: boolean;
  originalInvoiceNumber?: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
    // Dynamic import — PDFKit is CJS, avoid issues with bundling
    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: data.invoiceNumber,
          Author: "GrwFit",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.buildInvoiceLayout(doc, data);
      doc.end();
    });
  }

  private buildInvoiceLayout(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;
    const col2 = pageW - margin - 180;

    // ── Header ──────────────────────────────────────────────────────────────

    // Gym name (large)
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#1a1a2e").text(data.gymName, margin, 45);

    // GST Invoice label
    doc.fontSize(10).font("Helvetica").fillColor("#555")
      .text(data.isCreditNote ? "CREDIT NOTE" : "TAX INVOICE (GST)", margin, 72);

    // Invoice metadata (right-aligned)
    doc.fontSize(9).font("Helvetica").fillColor("#333");
    const docLabel = data.isCreditNote ? "Credit Note No." : "Invoice No.";
    doc.text(`${docLabel}: ${data.invoiceNumber}`, col2, 45, { width: 180, align: "right" });
    doc.text(
      `Date: ${data.invoiceDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
      col2, 60, { width: 180, align: "right" },
    );
    if (data.gymGstin) {
      doc.text(`GSTIN: ${data.gymGstin}`, col2, 75, { width: 180, align: "right" });
    }

    // HSN/SAC
    doc.text("HSN/SAC: 999794 (Gym / Fitness Services)", col2, 90, { width: 180, align: "right" });

    // Divider
    doc.moveTo(margin, 110).lineTo(pageW - margin, 110).strokeColor("#ddd").lineWidth(1).stroke();

    // ── Gym address + Bill-to ───────────────────────────────────────────────

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#888").text("BILLED FROM", margin, 122);
    doc.fontSize(9).font("Helvetica").fillColor("#333")
      .text(data.gymName, margin, 134)
      .text(data.gymAddress, margin, 146, { width: 230 })
      .text(data.gymPhone, margin, 165);

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#888").text("BILLED TO", col2, 122);
    doc.fontSize(9).font("Helvetica").fillColor("#333")
      .text(data.memberName, col2, 134, { width: 180 })
      .text(data.memberPhone, col2, 146, { width: 180 });

    if (data.isCreditNote && data.originalInvoiceNumber) {
      doc.fontSize(8).fillColor("#e53e3e")
        .text(`Against Invoice: ${data.originalInvoiceNumber}`, col2, 158, { width: 180 });
    }

    doc.moveTo(margin, 190).lineTo(pageW - margin, 190).strokeColor("#ddd").stroke();

    // ── Line Items Table ────────────────────────────────────────────────────

    const tableTop = 205;
    const colW = [contentW * 0.45, contentW * 0.15, contentW * 0.15, contentW * 0.25];
    const cols = [margin, margin + colW[0]!, margin + colW[0]! + colW[1]!, margin + colW[0]! + colW[1]! + colW[2]!];

    // Header row
    doc.rect(margin, tableTop, contentW, 20).fillColor("#f0f4ff").fill();
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#333");
    doc.text("DESCRIPTION", cols[0]! + 4, tableTop + 6);
    doc.text("HSN/SAC", cols[1]! + 4, tableTop + 6);
    doc.text("QTY", cols[2]! + 4, tableTop + 6);
    doc.text("AMOUNT", cols[3]! + 4, tableTop + 6, { width: colW[3]! - 8, align: "right" });

    // Data row
    const rowTop = tableTop + 22;
    doc.fontSize(9).font("Helvetica").fillColor("#222");
    doc.text(data.planName, cols[0]! + 4, rowTop);
    doc.text("999794", cols[1]! + 4, rowTop);
    doc.text("1", cols[2]! + 4, rowTop);
    doc.text(this.fmt(data.gst.basePaise), cols[3]! + 4, rowTop, { width: colW[3]! - 8, align: "right" });

    doc.moveTo(margin, rowTop + 20).lineTo(pageW - margin, rowTop + 20).strokeColor("#eee").stroke();

    // ── GST Breakdown ────────────────────────────────────────────────────────

    const gstTop = rowTop + 30;
    const labelX = margin + contentW * 0.5;
    const amtX = margin + contentW * 0.75;

    doc.fontSize(8.5).font("Helvetica").fillColor("#555");

    const lines: Array<[string, number]> = data.gst.isIntrastate
      ? [
          ["Taxable Amount", data.gst.basePaise],
          ["CGST @ 9%", data.gst.cgstPaise],
          ["SGST @ 9%", data.gst.sgstPaise],
        ]
      : [
          ["Taxable Amount", data.gst.basePaise],
          ["IGST @ 18%", data.gst.igstPaise],
        ];

    lines.forEach(([label, paise], i) => {
      doc.text(label, labelX, gstTop + i * 16, { width: 140, align: "right" });
      doc.text(this.fmt(paise), amtX, gstTop + i * 16, { width: 100, align: "right" });
    });

    const totalTop = gstTop + lines.length * 16 + 8;
    doc.rect(labelX, totalTop, 160 + (amtX - labelX - 140), 22).fillColor("#1a1a2e").fill();
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#fff");
    doc.text("TOTAL", labelX + 4, totalTop + 6, { width: 140, align: "right" });
    doc.text(this.fmt(data.gst.totalPaise), amtX, totalTop + 6, { width: 100, align: "right" });

    // ── Payment Details ───────────────────────────────────────────────────────

    const payTop = totalTop + 40;
    doc.moveTo(margin, payTop).lineTo(pageW - margin, payTop).strokeColor("#ddd").stroke();
    doc.fontSize(8).font("Helvetica").fillColor("#555");
    doc.text(
      `Payment Mode: ${data.paymentMode.toUpperCase()}${data.txnRef ? ` · Ref: ${data.txnRef}` : ""}`,
      margin, payTop + 8,
    );

    // ── Footer ────────────────────────────────────────────────────────────────

    const footerTop = doc.page.height - 80;
    doc.moveTo(margin, footerTop).lineTo(pageW - margin, footerTop).strokeColor("#ddd").stroke();
    doc.fontSize(7.5).font("Helvetica").fillColor("#888")
      .text("This is a computer-generated invoice. No signature required.", margin, footerTop + 8, {
        align: "center", width: contentW,
      })
      .text("GrwFit · grwfit.com · GST compliant invoicing", margin, footerTop + 20, {
        align: "center", width: contentW,
      });
  }

  private fmt(paise: number): string {
    return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }
}
