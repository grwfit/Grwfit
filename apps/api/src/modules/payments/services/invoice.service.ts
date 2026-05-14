import { Injectable, Logger } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";

export interface GstBreakdown {
  basePaise: number;
  gstPct: number;
  gstAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  isIntrastate: boolean;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  /**
   * Atomically increments the sequence and returns the formatted invoice number.
   * Uses INSERT ... ON CONFLICT DO UPDATE RETURNING — no race conditions.
   */
  async nextInvoiceNumber(gymId: string): Promise<string> {
    const fy = this.currentFinancialYear();
    const prisma = getPrismaClient();

    const rows = await prisma.$queryRaw<[{ last_number: number }]>`
      INSERT INTO invoice_sequences (gym_id, fy, last_number)
      VALUES (${gymId}::uuid, ${fy}, 1)
      ON CONFLICT (gym_id, fy)
      DO UPDATE SET last_number = invoice_sequences.last_number + 1
      RETURNING last_number
    `;

    const num = rows[0]?.last_number ?? 1;
    return `GRW/${fy}/${String(num).padStart(4, "0")}`;
  }

  /**
   * Compute GST breakdown from total (inclusive).
   * Default: intrastate → CGST 9% + SGST 9% = 18%
   * Interstate: IGST 18%
   */
  computeGst(totalPaise: number, isIntrastate = true): GstBreakdown {
    const gstPct = 18;
    // Back-calculate: total = base * 1.18
    const basePaise = Math.round((totalPaise * 100) / 118);
    const gstAmountPaise = totalPaise - basePaise;

    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    if (isIntrastate) {
      cgstPaise = Math.floor(gstAmountPaise / 2);
      sgstPaise = gstAmountPaise - cgstPaise; // odd paise goes to SGST
    } else {
      igstPaise = gstAmountPaise;
    }

    return {
      basePaise,
      gstPct,
      gstAmountPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      totalPaise,
      isIntrastate,
    };
  }

  /** Indian financial year: April 1 – March 31 */
  currentFinancialYear(): string {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-based
    const year = now.getFullYear();
    if (month >= 4) {
      return `${year}-${String(year + 1).slice(2)}`;
    }
    return `${year - 1}-${String(year).slice(2)}`;
  }

  paiseToRupees(paise: number): string {
    return `₹${(paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
