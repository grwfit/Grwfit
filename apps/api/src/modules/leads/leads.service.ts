import {
  Injectable, Logger, NotFoundException, ConflictException, BadRequestException,
} from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { Prisma } from "@grwfit/db";
import type { LeadActivityType } from "@grwfit/db";
import type {
  CreateLeadDto, UpdateLeadDto, MoveLeadDto, LostLeadDto,
  ConvertLeadDto, AddLeadActivityDto, ListLeadsQueryDto,
  CreateLeadStageDto, UpdateLeadStageDto, ReorderStagesDto,
} from "./dto/leads.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

const DEFAULT_STAGES = [
  { name: "New",        position: 0, color: "#6366f1", isDefault: true  },
  { name: "Trial Booked", position: 1, color: "#f59e0b", isDefault: false },
  { name: "Trial Visited",position: 2, color: "#8b5cf6", isDefault: false },
  { name: "Negotiating", position: 3, color: "#ec4899", isDefault: false },
  { name: "Converted",  position: 4, color: "#10b981", isDefault: false },
  { name: "Lost",       position: 5, color: "#ef4444", isDefault: false },
];

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly prisma = getPrismaClient();

  constructor() {}

  // ── Stages ────────────────────────────────────────────────────────────────

  async getStages(gymId: string) {
    return this.prisma.leadStage.findMany({
      where: { gymId },
      orderBy: { position: "asc" },
    });
  }

  async ensureDefaultStages(gymId: string): Promise<void> {
    const existing = await this.prisma.leadStage.count({ where: { gymId } });
    if (existing > 0) return;
    await this.prisma.leadStage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ gymId, ...s })),
    });
  }

  async createStage(gymId: string, dto: CreateLeadStageDto) {
    return this.prisma.leadStage.create({
      data: {
        gymId,
        name: dto.name,
        position: dto.position,
        color: dto.color ?? "#6366f1",
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updateStage(gymId: string, stageId: string, dto: UpdateLeadStageDto) {
    const stage = await this.prisma.leadStage.findFirst({ where: { id: stageId, gymId } });
    if (!stage) throw new NotFoundException("Stage not found");
    return this.prisma.leadStage.update({
      where: { id: stageId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.color && { color: dto.color }),
      },
    });
  }

  async deleteStage(gymId: string, stageId: string) {
    const stage = await this.prisma.leadStage.findFirst({ where: { id: stageId, gymId } });
    if (!stage) throw new NotFoundException("Stage not found");
    const count = await this.prisma.lead.count({ where: { stageId } });
    if (count > 0) throw new BadRequestException("Cannot delete stage with leads — move them first");
    await this.prisma.leadStage.delete({ where: { id: stageId } });
  }

  async reorderStages(gymId: string, dto: ReorderStagesDto) {
    await this.prisma.$transaction(
      dto.stageIds.map((id, i) =>
        this.prisma.leadStage.update({ where: { id, gymId }, data: { position: i } }),
      ),
    );
  }

  // ── Leads (Kanban) ────────────────────────────────────────────────────────

  async getKanban(gymId: string) {
    await this.ensureDefaultStages(gymId);
    const [stages, leads] = await Promise.all([
      this.prisma.leadStage.findMany({ where: { gymId }, orderBy: { position: "asc" } }),
      this.prisma.lead.findMany({
        where: { gymId, status: "open" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, phone: true, email: true,
          source: true, stageId: true, assignedTo: true,
          tags: true, followUpAt: true, createdAt: true, updatedAt: true,
        },
      }),
    ]);

    const leadsByStage = new Map<string, typeof leads>();
    for (const lead of leads) {
      const key = lead.stageId ?? "unassigned";
      if (!leadsByStage.has(key)) leadsByStage.set(key, []);
      leadsByStage.get(key)!.push(lead);
    }

    return stages.map((stage) => ({
      ...stage,
      leads: leadsByStage.get(stage.id) ?? [],
    }));
  }

  async listLeads(gymId: string, query: ListLeadsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const where: Prisma.LeadWhereInput = {
      gymId,
      ...(query.stageId && { stageId: query.stageId }),
      ...(query.source && { source: query.source as never }),
      ...(query.status && { status: query.status as never }),
      ...(query.assignedTo && { assignedTo: query.assignedTo }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, leads] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: "desc" },
        include: { stage: { select: { name: true, color: true } } },
      }),
    ]);

    return { data: leads, meta: { page, limit, total } };
  }

  async getLead(gymId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, gymId },
      include: {
        stage: true,
        activities: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  async createLead(gymId: string, dto: CreateLeadDto, req: AuthenticatedRequest) {
    await this.ensureDefaultStages(gymId);

    // Normalise phone
    const phone = dto.phone.startsWith("+91") ? dto.phone : `+91${dto.phone.replace(/^0/, "")}`;

    const existing = await this.prisma.lead.findFirst({ where: { gymId, phone } });
    if (existing) throw new ConflictException(`Lead with phone ${phone} already exists`);

    const defaultStage = await this.prisma.leadStage.findFirst({
      where: { gymId, isDefault: true },
      orderBy: { position: "asc" },
    });

    const lead = await this.prisma.lead.create({
      data: {
        gymId,
        branchId: dto.branchId ?? null,
        phone,
        name: dto.name,
        email: dto.email ?? null,
        source: (dto.source as never) ?? "walk_in",
        sourceDetails: dto.sourceDetails ? (dto.sourceDetails as Prisma.InputJsonValue) : Prisma.JsonNull,
        stageId: dto.stageId ?? defaultStage?.id ?? null,
        assignedTo: dto.assignedTo ?? req.userId ?? null,
        tags: dto.tags ?? [],
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null,
      },
    });

    // WhatsApp acknowledgment sent after lead is created — see WhatsApp trigger rules

    // Log activity
    await this.prisma.leadActivity.create({
      data: {
        gymId, leadId: lead.id,
        staffId: req.userId ?? null,
        type: "note",
        notes: `Lead created via ${dto.source ?? "walk_in"}`,
      },
    });

    return lead;
  }

  async updateLead(gymId: string, leadId: string, dto: UpdateLeadDto, req: AuthenticatedRequest) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, gymId } });
    if (!lead) throw new NotFoundException("Lead not found");

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone && { phone: dto.phone.startsWith("+91") ? dto.phone : `+91${dto.phone}` }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.stageId && { stageId: dto.stageId }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.followUpAt !== undefined && { followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null }),
      },
    });

    // Log stage change if applicable
    if (dto.stageId && dto.stageId !== lead.stageId) {
      const newStage = await this.prisma.leadStage.findUnique({ where: { id: dto.stageId } });
      await this.prisma.leadActivity.create({
        data: {
          gymId, leadId,
          staffId: req.userId ?? null,
          type: "stage_change",
          notes: `Moved to ${newStage?.name ?? "new stage"}`,
          metadata: { fromStageId: lead.stageId, toStageId: dto.stageId },
        },
      });
    }

    return updated;
  }

  async moveLead(gymId: string, leadId: string, dto: MoveLeadDto, req: AuthenticatedRequest) {
    return this.updateLead(gymId, leadId, { stageId: dto.stageId }, req);
  }

  async markLost(gymId: string, leadId: string, dto: LostLeadDto, req: AuthenticatedRequest) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, gymId } });
    if (!lead) throw new NotFoundException("Lead not found");

    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: { status: "lost", lostReason: dto.reason ?? null },
      }),
      this.prisma.leadActivity.create({
        data: {
          gymId, leadId,
          staffId: req.userId ?? null,
          type: "note",
          notes: `Marked lost${dto.reason ? `: ${dto.reason}` : ""}`,
        },
      }),
    ]);

    return updated;
  }

  async convertToMember(gymId: string, leadId: string, dto: ConvertLeadDto, req: AuthenticatedRequest) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, gymId } });
    if (!lead) throw new NotFoundException("Lead not found");
    if (lead.status === "converted") throw new BadRequestException("Lead already converted");

    // Check for existing member with same phone
    const existingMember = await this.prisma.member.findFirst({ where: { gymId, phone: lead.phone } });
    if (existingMember) throw new ConflictException("A member with this phone number already exists");

    const [member] = await this.prisma.$transaction([
      this.prisma.member.create({
        data: {
          gymId,
          branchId: dto.branchId ?? lead.branchId ?? null,
          phone: lead.phone,
          name: lead.name,
          email: lead.email ?? null,
          currentPlanId: dto.planId ?? null,
          assignedTrainerId: dto.assignedTrainerId ?? null,
          qrCode: `GRW-${leadId.replace(/-/g, "").substring(0, 12).toUpperCase()}`,
          status: "trial",
          joinedAt: new Date(),
          createdBy: req.userId ?? null,
        },
      }),
      this.prisma.lead.update({
        where: { id: leadId },
        data: { status: "converted", convertedAt: new Date(), convertedToMemberId: undefined },
      }),
      this.prisma.leadActivity.create({
        data: {
          gymId, leadId,
          staffId: req.userId ?? null,
          type: "converted",
          notes: "Lead converted to member",
        },
      }),
    ]);

    return { member, leadId };
  }

  // ── Activities ────────────────────────────────────────────────────────────

  async addActivity(gymId: string, leadId: string, dto: AddLeadActivityDto, req: AuthenticatedRequest) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, gymId } });
    if (!lead) throw new NotFoundException("Lead not found");

    const activity = await this.prisma.leadActivity.create({
      data: {
        gymId, leadId,
        staffId: req.userId ?? null,
        type: dto.type as LeadActivityType,
        notes: dto.notes ?? null,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    // Update followUpAt if a call/visit was logged
    if (["call", "visit"].includes(dto.type)) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { followUpAt: null }, // clear follow-up after contact
      });
    }

    return activity;
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getFunnelReport(gymId: string, days = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [bySource, byStatus, conversion] = await this.prisma.$transaction([
      this.prisma.lead.groupBy({
        by: ["source"],
        where: { gymId, createdAt: { gte: from } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      this.prisma.lead.groupBy({
        by: ["status"],
        where: { gymId, createdAt: { gte: from } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      this.prisma.lead.aggregate({
        where: { gymId, status: "converted", convertedAt: { gte: from } },
        _count: { id: true },
      }),
    ]);

    const totalLeads = byStatus.reduce((s, r) => s + ((r._count as Record<string, number>)["id"] ?? 0), 0);
    const convertedCount = (conversion._count as Record<string, number>)["id"] ?? 0;

    return {
      bySource: bySource.map((r) => ({ source: r.source, count: (r._count as Record<string, number>)["id"] ?? 0 })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: (r._count as Record<string, number>)["id"] ?? 0 })),
      conversionRate: totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0,
      totalLeads,
      convertedCount,
      period: `${days}d`,
    };
  }
}
