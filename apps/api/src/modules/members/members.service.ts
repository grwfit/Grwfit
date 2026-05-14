import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { getPrismaClient } from "@grwfit/db";
import { Prisma } from "@grwfit/db";
import { WhatsAppService } from "../auth/services/whatsapp.service";
import { WhatsAppModuleService } from "../whatsapp/whatsapp.service";
import { resolveBranchFilter, assertBranchAccess } from "../../common/helpers/branch-access";
import type { CreateMemberQuickDto, CreateMemberFullDto } from "./dto/create-member.dto";
import type { UpdateMemberDto } from "./dto/update-member.dto";
import type { ListMembersQueryDto } from "./dto/list-members-query.dto";
import type { FreezeMemberDto } from "./dto/freeze-member.dto";
import type { AddNoteDto } from "./dto/add-note.dto";
import type { BulkActionDto } from "./dto/bulk-action.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

const MEMBER_SELECT = {
  id: true, gymId: true, branchId: true,
  phone: true, email: true, name: true,
  dob: true, gender: true, photoUrl: true,
  status: true, joinedAt: true, expiresAt: true,
  currentPlanId: true, assignedTrainerId: true,
  tags: true, qrCode: true, doNotMessage: true,
  createdAt: true, updatedAt: true,
  branch: { select: { id: true, name: true } },
} as const;

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly whatsApp: WhatsAppService,
    private readonly whatsAppModule: WhatsAppModuleService,
  ) {}

  // ── CREATE ─────────────────────────────────────────────────────────────────

  async create(
    gymId: string,
    dto: CreateMemberQuickDto | CreateMemberFullDto,
    req: AuthenticatedRequest,
  ) {
    const prisma = getPrismaClient();

    const existing = await prisma.member.findFirst({ where: { gymId, phone: dto.phone } });
    if (existing) throw new ConflictException(`Member with phone ${dto.phone} already exists`);

    if (dto.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: dto.branchId, gymId } });
      if (!branch) throw new NotFoundException("Branch not found");
    }

    const memberId = crypto.randomUUID();
    const qrCode = this.generateQrCode(memberId);

    const full = dto as CreateMemberFullDto;
    const member = await prisma.member.create({
      data: {
        id: memberId,
        gymId,
        phone: dto.phone,
        name: dto.name,
        branchId: dto.branchId ?? null,
        assignedTrainerId: dto.assignedTrainerId ?? null,
        currentPlanId: dto.planId ?? null,
        qrCode,
        email: full.email ?? null,
        dob: full.dob ? new Date(full.dob) : null,
        gender: full.gender ?? null,
        address: full.address ? (full.address as Prisma.InputJsonValue) : Prisma.JsonNull,
        emergencyContactName: full.emergencyContactName ?? null,
        emergencyContactPhone: full.emergencyContactPhone ?? null,
        goals: full.goals ? (full.goals as Prisma.InputJsonValue) : Prisma.JsonNull,
        healthNotes: full.healthNotes ?? null,
        medicalConditions: full.medicalConditions ?? null,
        tags: full.tags ?? [],
        createdBy: req.userId ?? null,
        status: "trial",
        joinedAt: new Date(),
      },
      select: MEMBER_SELECT,
    });

    // Fire trigger rule (DB-driven) — supersedes hardcoded template
    void this.whatsAppModule.fireTrigger(gymId, "member_created", memberId, {
      name: dto.name,
    }).catch((err) => this.logger.warn(`Trigger member_created failed: ${err}`));

    await prisma.auditLog.create({
      data: { gymId, actorId: req.userId!, actorType: "staff", action: "create", entity: "members", entityId: member.id },
    });

    return member;
  }

  // ── LIST ───────────────────────────────────────────────────────────────────

  async list(gymId: string, query: ListMembersQueryDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const branchId = resolveBranchFilter(req, query.branchId);

    const where: Prisma.MemberWhereInput = {
      gymId,
      deletedAt: null,
      ...(branchId && { branchId }),
      ...(query.status && { status: query.status as "active" | "expired" | "frozen" | "trial" }),
      ...(query.trainerId && { assignedTrainerId: query.trainerId }),
      ...(query.planId && { currentPlanId: query.planId }),
      ...(query.tag && { tags: { array_contains: query.tag } }),
      ...(query.joinedFrom || query.joinedTo
        ? {
            joinedAt: {
              ...(query.joinedFrom && { gte: new Date(query.joinedFrom) }),
              ...(query.joinedTo && { lte: new Date(query.joinedTo) }),
            },
          }
        : {}),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
          { id: query.search.length === 36 ? query.search : undefined },
        ],
      }),
    };

    const sortField = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";
    const orderBy: Prisma.MemberOrderByWithRelationInput =
      sortField === "name" ? { name: sortOrder }
      : sortField === "joinedAt" ? { joinedAt: sortOrder }
      : sortField === "expiresAt" ? { expiresAt: sortOrder }
      : { createdAt: sortOrder };

    const [items, total] = await prisma.$transaction([
      prisma.member.findMany({ where, select: MEMBER_SELECT, orderBy, skip, take: limit }),
      prisma.member.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ── FIND ONE ───────────────────────────────────────────────────────────────

  async findOne(gymId: string, memberId: string, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
      select: {
        ...MEMBER_SELECT,
        address: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        goals: true,
        healthNotes: true,
        medicalConditions: true,
      },
    });
    if (!member) throw new NotFoundException("Member not found");
    assertBranchAccess(req, member.branchId);
    return member;
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  async update(gymId: string, memberId: string, dto: UpdateMemberDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const existing = await prisma.member.findFirst({ where: { id: memberId, gymId, deletedAt: null } });
    if (!existing) throw new NotFoundException("Member not found");
    assertBranchAccess(req, existing.branchId);

    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.dob !== undefined && { dob: dto.dob ? new Date(dto.dob) : null }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.address !== undefined && { address: dto.address as object }),
        ...(dto.emergencyContactName !== undefined && { emergencyContactName: dto.emergencyContactName }),
        ...(dto.emergencyContactPhone !== undefined && { emergencyContactPhone: dto.emergencyContactPhone }),
        ...(dto.goals !== undefined && { goals: dto.goals }),
        ...(dto.healthNotes !== undefined && { healthNotes: dto.healthNotes }),
        ...(dto.medicalConditions !== undefined && { medicalConditions: dto.medicalConditions }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.assignedTrainerId !== undefined && { assignedTrainerId: dto.assignedTrainerId }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.planId !== undefined && { currentPlanId: dto.planId }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
      },
      select: MEMBER_SELECT,
    });

    await prisma.auditLog.create({
      data: { gymId, actorId: req.userId!, actorType: "staff", action: "update", entity: "members", entityId: memberId },
    });

    return member;
  }

  // ── FREEZE / UNFREEZE ──────────────────────────────────────────────────────

  async freeze(gymId: string, memberId: string, dto: FreezeMemberDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const member = await prisma.member.findFirst({ where: { id: memberId, gymId, deletedAt: null } });
    if (!member) throw new NotFoundException("Member not found");
    if (member.status === "frozen") throw new ConflictException("Member is already frozen");
    assertBranchAccess(req, member.branchId);

    const untilDate = dto.untilDate ? new Date(dto.untilDate) : null;

    await prisma.$transaction([
      prisma.member.update({ where: { id: memberId }, data: { status: "frozen" } }),
      prisma.memberFreezeHistory.create({
        data: {
          gymId,
          memberId,
          frozenUntil: untilDate,
          reason: dto.reason ?? null,
          frozenBy: req.userId!,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        gymId, actorId: req.userId!, actorType: "staff",
        action: "update", entity: "members", entityId: memberId,
        diff: { status: { from: member.status, to: "frozen" }, reason: dto.reason, until: dto.untilDate },
      },
    });

    return { frozen: true };
  }

  async unfreeze(gymId: string, memberId: string, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const member = await prisma.member.findFirst({ where: { id: memberId, gymId, deletedAt: null } });
    if (!member) throw new NotFoundException("Member not found");
    if (member.status !== "frozen") throw new BadRequestException("Member is not frozen");
    assertBranchAccess(req, member.branchId);

    const now = new Date();
    const activeFreeze = await prisma.memberFreezeHistory.findFirst({
      where: { memberId, unfrozenAt: null },
      orderBy: { frozenAt: "desc" },
    });

    await prisma.$transaction([
      prisma.member.update({ where: { id: memberId }, data: { status: "active" } }),
      ...(activeFreeze
        ? [prisma.memberFreezeHistory.update({ where: { id: activeFreeze.id }, data: { unfrozenAt: now } })]
        : []),
    ]);

    return { unfrozen: true };
  }

  /** Cron: auto-unfreeze members whose freeze period has passed */
  async processAutoUnfreezes(gymId?: string) {
    const prisma = getPrismaClient();
    const now = new Date();

    const expiredFreezes = await prisma.memberFreezeHistory.findMany({
      where: {
        unfrozenAt: null,
        frozenUntil: { lte: now },
        ...(gymId && { gymId }),
      },
      include: { member: { select: { id: true, gymId: true, status: true } } },
    });

    let count = 0;
    for (const freeze of expiredFreezes) {
      if (freeze.member.status !== "frozen") continue;
      await prisma.$transaction([
        prisma.member.update({ where: { id: freeze.memberId }, data: { status: "active" } }),
        prisma.memberFreezeHistory.update({ where: { id: freeze.id }, data: { unfrozenAt: now } }),
      ]);
      count++;
    }

    if (count > 0) this.logger.log(`Auto-unfroze ${count} members`);
    return count;
  }

  // ── NOTES ─────────────────────────────────────────────────────────────────

  async addNote(gymId: string, memberId: string, dto: AddNoteDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const member = await prisma.member.findFirst({ where: { id: memberId, gymId, deletedAt: null } });
    if (!member) throw new NotFoundException("Member not found");

    const note = await prisma.memberNote.create({
      data: { gymId, memberId, staffId: req.userId!, note: dto.note },
    });

    return note;
  }

  async getNotes(gymId: string, memberId: string) {
    const prisma = getPrismaClient();
    return prisma.memberNote.findMany({
      where: { gymId, memberId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  // ── BULK ACTIONS ──────────────────────────────────────────────────────────

  async bulkAction(gymId: string, dto: BulkActionDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();

    // Verify all member IDs belong to this gym
    const members = await prisma.member.findMany({
      where: { id: { in: dto.memberIds }, gymId, deletedAt: null },
      select: { id: true, name: true, phone: true },
    });

    if (members.length !== dto.memberIds.length) {
      throw new BadRequestException("Some member IDs are invalid or from another gym");
    }

    switch (dto.action) {
      case "tag": {
        if (!dto.tag) throw new BadRequestException("tag is required");
        await prisma.$executeRaw`
          UPDATE members
          SET tags = CASE
            WHEN tags @> ${JSON.stringify([dto.tag])}::jsonb THEN tags
            ELSE tags || ${JSON.stringify([dto.tag])}::jsonb
          END
          WHERE id = ANY(${dto.memberIds}::uuid[]) AND gym_id = ${gymId}::uuid
        `;
        return { updated: members.length };
      }
      case "assign_trainer": {
        if (!dto.trainerId) throw new BadRequestException("trainerId is required");
        const trainer = await prisma.staffUser.findFirst({
          where: { id: dto.trainerId, gymId, role: "trainer", isActive: true },
        });
        if (!trainer) throw new NotFoundException("Trainer not found");
        await prisma.member.updateMany({
          where: { id: { in: dto.memberIds }, gymId },
          data: { assignedTrainerId: dto.trainerId },
        });
        return { updated: members.length };
      }
      case "send_whatsapp": {
        if (!dto.message) throw new BadRequestException("message is required");
        let sent = 0;
        for (const m of members) {
          const result = await this.whatsApp.sendOtp(m.phone, "");
          if (result.success) sent++;
        }
        return { sent };
      }
      case "export_csv": {
        return { csv: this.buildCsv(members) };
      }
    }
  }

  // ── EXPORT CSV ────────────────────────────────────────────────────────────

  async exportCsv(gymId: string, query: ListMembersQueryDto, req: AuthenticatedRequest) {
    const { items } = await this.list(gymId, { ...query, limit: 10000 }, req);
    return this.buildCsv(items as Array<{ id: string; name: string; phone: string; email: string | null; status: string; joinedAt: Date | null }>);
  }

  // ── QR CODE ───────────────────────────────────────────────────────────────

  private generateQrCode(memberId: string): string {
    return `GRW-${memberId.toUpperCase()}`;
  }

  private buildCsv(
    rows: Array<{ id: string; name: string; phone: string; email?: string | null; status?: string; joinedAt?: Date | null }>,
  ): string {
    const header = "ID,Name,Phone,Email,Status,Joined At";
    const lines = rows.map(
      (r) =>
        `"${r.id}","${r.name.replace(/"/g, '""')}","${r.phone}","${r.email ?? ""}","${r.status ?? ""}","${r.joinedAt ? new Date(r.joinedAt).toISOString().split("T")[0] : ""}"`,
    );
    return [header, ...lines].join("\n");
  }
}
