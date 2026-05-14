import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import { InvoiceService } from "./services/invoice.service";
import { PdfService } from "./services/pdf.service";
import { StorageService } from "./services/storage.service";
import { RazorpayService } from "./services/razorpay.service";
import { WhatsAppService } from "../auth/services/whatsapp.service";
import { WhatsAppModuleService } from "../whatsapp/whatsapp.service";
import { TrainersService } from "../trainers/trainers.service";
import type { CreatePaymentDto } from "./dto/create-payment.dto";
import type { RefundDto } from "./dto/refund.dto";
import type { ListPaymentsQueryDto, CreateCashReconciliationDto, CreatePlanDto } from "./dto/list-payments-query.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { addDays } from "date-fns";

export const PAYMENT_WEBHOOK_QUEUE = "payment-webhook";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly razorpay: RazorpayService,
    private readonly whatsApp: WhatsAppService,
    private readonly whatsAppModule: WhatsAppModuleService,
    private readonly trainersService: TrainersService,
    @InjectQueue(PAYMENT_WEBHOOK_QUEUE) private readonly webhookQueue: Queue,
  ) {}

  // ── PLANS ─────────────────────────────────────────────────────────────────

  async listPlans(gymId: string) {
    const prisma = getPrismaClient();
    return prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { pricePaise: "asc" },
    });
  }

  async createPlan(gymId: string, dto: CreatePlanDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const plan = await prisma.membershipPlan.create({
      data: { gymId, ...dto },
    });
    await prisma.auditLog.create({
      data: { gymId, actorId: req.userId!, actorType: "staff", action: "create", entity: "membership_plans", entityId: plan.id },
    });
    return plan;
  }

  async updatePlan(gymId: string, planId: string, dto: Partial<CreatePlanDto>, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const plan = await prisma.membershipPlan.findFirst({ where: { id: planId, gymId } });
    if (!plan) throw new NotFoundException("Plan not found");
    return prisma.membershipPlan.update({ where: { id: planId }, data: dto });
  }

  async deletePlan(gymId: string, planId: string) {
    const prisma = getPrismaClient();
    await prisma.membershipPlan.update({ where: { id: planId }, data: { isActive: false } });
    return { deleted: true };
  }

  // ── PAYMENTS ─────────────────────────────────────────────────────────────

  async create(gymId: string, dto: CreatePaymentDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();

    // Validate member
    const member = await prisma.member.findFirst({
      where: { id: dto.memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException("Member not found");

    // Validate plan
    let plan: Awaited<ReturnType<typeof prisma.membershipPlan.findFirst>> = null;
    if (dto.planId) {
      plan = await prisma.membershipPlan.findFirst({ where: { id: dto.planId, gymId } });
      if (!plan) throw new NotFoundException("Plan not found");
    }

    // Fetch gym for invoice
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { name: true, gstNo: true, address: true, phone: true },
    });

    // Compute GST breakdown (total is inclusive of 18% GST)
    const gst = this.invoiceService.computeGst(dto.totalPaise);

    // Atomic invoice number
    const invoiceNumber = await this.invoiceService.nextInvoiceNumber(gymId);

    // Create payment record
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          gymId,
          memberId: dto.memberId,
          planId: dto.planId ?? null,
          amountPaise: gst.basePaise,
          gstPct: gst.gstPct,
          gstAmountPaise: gst.gstAmountPaise,
          totalPaise: gst.totalPaise,
          mode: dto.mode,
          status: "captured",
          txnRef: dto.txnRef ?? null,
          notes: dto.notes ?? null,
          invoiceNumber,
          createdBy: req.userId ?? null,
          paidAt: new Date(),
        },
        include: { member: { select: { name: true, phone: true, assignedTrainerId: true } } },
      });

      // Extend member's expiry
      if (plan) {
        const currentExpiry = member.expiresAt && member.expiresAt > new Date()
          ? member.expiresAt
          : new Date();
        const newExpiry = addDays(currentExpiry, plan.durationDays);
        await tx.member.update({
          where: { id: dto.memberId },
          data: { expiresAt: newExpiry, status: "active", currentPlanId: dto.planId ?? undefined },
        });
      }

      await tx.auditLog.create({
        data: { gymId, actorId: req.userId!, actorType: "staff", action: "create", entity: "payments", entityId: p.id,
          diff: { amount: gst.totalPaise, mode: dto.mode, invoiceNumber } },
      });

      return p;
    });

    // Auto-create commission if member has an assigned trainer with commission %
    if (payment.member.assignedTrainerId) {
      const prisma = getPrismaClient();
      const trainer = await prisma.staffUser.findFirst({
        where: { id: payment.member.assignedTrainerId, gymId },
        select: { commissionPct: true },
      });
      if (trainer?.commissionPct && Number(trainer.commissionPct) > 0) {
        void this.trainersService.createCommissionForPayment({
          gymId,
          trainerId: payment.member.assignedTrainerId,
          memberId: dto.memberId,
          paymentId: payment.id,
          totalPaise: gst.totalPaise,
          commissionPct: Number(trainer.commissionPct),
        }).catch((err) => this.logger.error("Commission creation failed", err));
      }
    }

    // Fire payment_success trigger rule (DB-driven)
    void this.whatsAppModule.fireTrigger(gymId, "payment_success", dto.memberId, {
      name: payment.member.name,
      amount: this.invoiceService.paiseToRupees(gst.totalPaise),
      invoice: invoiceNumber,
    }).catch((err) => this.logger.warn(`Trigger payment_success failed: ${err}`));

    // Generate PDF + WhatsApp async (not awaited — returns fast, then updates PDF URL)
    void this.generateAndDeliverInvoice(payment.id, {
      invoiceNumber,
      gymId,
      gymName: gym!.name,
      gymAddress: this.formatAddress(gym!.address as Record<string, string>),
      gymPhone: gym!.phone,
      gymGstin: gym!.gstNo,
      memberName: payment.member.name,
      memberPhone: payment.member.phone,
      planName: plan?.name ?? "Gym Membership",
      gst,
      paymentMode: dto.mode,
      txnRef: dto.txnRef ?? null,
    }).catch((err) => this.logger.error("Invoice generation failed", err));

    return payment;
  }

  async list(gymId: string, query: ListPaymentsQueryDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      gymId,
      ...(query.memberId && { memberId: query.memberId }),
      ...(query.mode && { mode: query.mode as "upi" | "cash" | "card" | "bank_transfer" | "razorpay" }),
      ...(query.status && { status: query.status as "pending" | "captured" | "failed" | "refunded" | "partially_refunded" }),
      ...(query.from || query.to
        ? { paidAt: { ...(query.from && { gte: new Date(query.from) }), ...(query.to && { lte: new Date(query.to) }) } }
        : {}),
      ...(query.search && {
        OR: [
          { invoiceNumber: { contains: query.search, mode: "insensitive" } },
          { member: { name: { contains: query.search, mode: "insensitive" } } },
          { txnRef: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where, skip, take: limit,
        include: { member: { select: { id: true, name: true, phone: true } }, plan: { select: { name: true } } },
        orderBy: { paidAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(gymId: string, paymentId: string) {
    const prisma = getPrismaClient();
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, gymId },
      include: {
        member: { select: { id: true, name: true, phone: true } },
        plan: { select: { name: true, durationDays: true } },
        refunds: true,
      },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  async refund(gymId: string, paymentId: string, dto: RefundDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, gymId },
      include: { member: { select: { name: true, phone: true } } },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === "refunded") throw new BadRequestException("Already fully refunded");
    if (dto.amountPaise > payment.totalPaise) {
      throw new BadRequestException("Refund amount exceeds payment total");
    }

    let razorpayRefundId: string | null = null;
    if (payment.mode === "razorpay" && payment.razorpayPaymentId) {
      try {
        const result = await this.razorpay.refund(payment.razorpayPaymentId, dto.amountPaise);
        razorpayRefundId = result.id;
      } catch (err) {
        this.logger.warn(`Razorpay refund failed, logging manually: ${err}`);
      }
    }

    const creditNoteNumber = `CN-${payment.invoiceNumber ?? paymentId.slice(0, 8)}`;

    const refund = await prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: {
          gymId,
          paymentId,
          amountPaise: dto.amountPaise,
          reason: dto.reason,
          status: "processed",
          razorpayRefundId,
          creditNoteNumber,
          processedBy: req.userId ?? null,
          refundedAt: new Date(),
        },
      });

      const newStatus = dto.amountPaise >= payment.totalPaise ? "refunded" : "partially_refunded";
      await tx.payment.update({ where: { id: paymentId }, data: { status: newStatus } });

      await tx.auditLog.create({
        data: { gymId, actorId: req.userId!, actorType: "staff", action: "update", entity: "payments", entityId: paymentId,
          diff: { refundAmount: dto.amountPaise, reason: dto.reason } },
      });

      return r;
    });

    return refund;
  }

  // ── GST REPORT ────────────────────────────────────────────────────────────

  async gstReport(gymId: string, from: string, to: string) {
    const prisma = getPrismaClient();
    const payments = await prisma.payment.findMany({
      where: {
        gymId, status: "captured",
        paidAt: { gte: new Date(from), lte: new Date(to) },
      },
      include: { member: { select: { name: true, phone: true } }, plan: { select: { name: true } } },
      orderBy: { paidAt: "asc" },
    });

    const totalRevenue = payments.reduce((s, p) => s + p.totalPaise, 0);
    const totalGst     = payments.reduce((s, p) => s + p.gstAmountPaise, 0);
    const totalBase    = totalRevenue - totalGst;

    return { payments, summary: { totalRevenue, totalGst, totalBase, count: payments.length } };
  }

  async exportGstCsv(gymId: string, from: string, to: string): Promise<string> {
    const { payments } = await this.gstReport(gymId, from, to);
    const header = "Invoice No,Date,Member,Plan,Base Amount (₹),CGST (₹),SGST (₹),Total (₹),Mode";
    const rows = payments.map((p) => {
      const base = p.amountPaise / 100;
      const gst  = p.gstAmountPaise / 100;
      const cgst = gst / 2;
      const sgst = gst / 2;
      const total = p.totalPaise / 100;
      return [
        p.invoiceNumber ?? "",
        new Date(p.paidAt).toLocaleDateString("en-IN"),
        `"${p.member.name}"`,
        `"${p.plan?.name ?? "—"}"`,
        base.toFixed(2), cgst.toFixed(2), sgst.toFixed(2), total.toFixed(2),
        p.mode,
      ].join(",");
    });
    return [header, ...rows].join("\n");
  }

  // ── CASH RECONCILIATION ───────────────────────────────────────────────────

  async createReconciliation(gymId: string, dto: CreateCashReconciliationDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const date = dto.date ? new Date(dto.date) : new Date();
    date.setHours(0, 0, 0, 0);

    // Sum all cash payments for the day
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const agg = await prisma.payment.aggregate({
      where: { gymId, mode: "cash", status: "captured", paidAt: { gte: startOfDay, lte: endOfDay } },
      _sum: { totalPaise: true },
    });

    const expectedPaise = agg._sum.totalPaise ?? 0;
    const actualPaise   = dto.actualPaise ?? 0;
    const variancePaise = actualPaise - expectedPaise;

    return prisma.cashReconciliation.upsert({
      where: { gymId_date: { gymId, date } },
      create: {
        gymId, date, expectedPaise, actualPaise, variancePaise,
        status: "submitted", submittedBy: req.userId ?? null,
        notes: dto.notes ?? null,
      },
      update: {
        expectedPaise, actualPaise, variancePaise,
        status: "submitted", submittedBy: req.userId ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async listReconciliations(gymId: string, limit = 30) {
    const prisma = getPrismaClient();
    return prisma.cashReconciliation.findMany({
      where: { gymId },
      orderBy: { date: "desc" },
      take: limit,
    });
  }

  async approveReconciliation(gymId: string, reconId: string, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const recon = await prisma.cashReconciliation.findFirst({ where: { id: reconId, gymId } });
    if (!recon) throw new NotFoundException("Reconciliation not found");
    if (!["owner", "manager"].includes(req.userRole ?? "")) {
      throw new ForbiddenException("Only owner or manager can approve reconciliation");
    }
    return prisma.cashReconciliation.update({
      where: { id: reconId },
      data: { status: "approved", approvedBy: req.userId, approvedAt: new Date() },
    });
  }

  // ── RAZORPAY WEBHOOK ──────────────────────────────────────────────────────

  async handleWebhook(rawBody: string, signature: string, event: string, payload: unknown) {
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException("Invalid webhook signature");
    }
    // Queue for async processing to return 200 fast
    await this.webhookQueue.add({ event, payload }, { attempts: 3 });
    return { received: true };
  }

  // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

  private async generateAndDeliverInvoice(
    paymentId: string,
    data: {
      invoiceNumber: string; gymId: string; gymName: string;
      gymAddress: string; gymPhone: string; gymGstin: string | null;
      memberName: string; memberPhone: string; planName: string;
      gst: ReturnType<InvoiceService["computeGst"]>;
      paymentMode: string; txnRef: string | null;
    },
  ) {
    const pdfBuffer = await this.pdfService.generateInvoicePdf({
      invoiceNumber: data.invoiceNumber,
      invoiceDate: new Date(),
      gymName: data.gymName,
      gymAddress: data.gymAddress,
      gymPhone: data.gymPhone,
      gymGstin: data.gymGstin,
      memberName: data.memberName,
      memberPhone: data.memberPhone,
      planName: data.planName,
      gst: data.gst,
      paymentMode: data.paymentMode,
      txnRef: data.txnRef,
    });

    const objectPath = `${data.gymId}/${data.invoiceNumber.replace(/\//g, "-")}.pdf`;
    const pdfUrl = await this.storageService.uploadPdf(pdfBuffer, objectPath);

    const prisma = getPrismaClient();
    await prisma.payment.update({ where: { id: paymentId }, data: { invoicePdfUrl: pdfUrl } });

    // WhatsApp invoice to member
    void this.whatsApp.sendTemplate(data.memberPhone, "payment_invoice", [
      data.memberName.split(" ")[0]!,
      this.invoiceService.paiseToRupees(data.gst.totalPaise),
      data.invoiceNumber,
      pdfUrl,
    ]).catch((err) => this.logger.warn(`WhatsApp invoice failed: ${err}`));

    this.logger.log(`Invoice ${data.invoiceNumber} generated and sent`);
  }

  private formatAddress(address: Record<string, string>): string {
    return [address["street"], address["city"], address["state"], address["pincode"]]
      .filter(Boolean)
      .join(", ");
  }
}
