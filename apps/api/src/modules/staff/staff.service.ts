import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import type { Prisma } from "@grwfit/db";
import { TokenService } from "../auth/services/token.service";
import { WhatsAppService } from "../auth/services/whatsapp.service";
import { assertBranchAccess, resolveBranchFilter } from "../../common/helpers/branch-access";
import type { CreateStaffDto } from "./dto/create-staff.dto";
import type { UpdateStaffDto } from "./dto/update-staff.dto";
import type { ListStaffQueryDto } from "./dto/list-staff-query.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

const STAFF_SELECT = {
  id: true,
  gymId: true,
  branchId: true,
  phone: true,
  email: true,
  name: true,
  role: true,
  commissionPct: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
} as const;

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async create(gymId: string, dto: CreateStaffDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();

    const existing = await prisma.staffUser.findFirst({
      where: { gymId, phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(`A staff member with phone ${dto.phone} already exists`);
    }

    if (dto.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: dto.branchId, gymId } });
      if (!branch) throw new NotFoundException("Branch not found");
    }

    const staff = await prisma.staffUser.create({
      data: {
        gymId,
        phone: dto.phone,
        name: dto.name,
        role: dto.role,
        branchId: dto.branchId ?? null,
        email: dto.email ?? null,
        commissionPct: dto.commissionPct != null ? dto.commissionPct : null,
        createdBy: req.userId ?? null,
      },
      select: STAFF_SELECT,
    });

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { name: true } });

    // Send WhatsApp invite
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://app.grwfit.com";
    const inviteMsg = `Hi ${dto.name}! 👋\n\nYou've been added to *${gym?.name}* on GrwFit as *${dto.role}*.\n\nLogin here: ${appUrl}/login\n\nYour phone number is your login ID.`;
    const waResult = await this.whatsAppService.sendTemplate(dto.phone, "staff_invite", [
      dto.name,
      gym?.name ?? "",
      dto.role,
      `${appUrl}/login`,
    ]);
    if (!waResult.success) {
      this.logger.warn(`WhatsApp invite skipped for ${dto.phone} (not configured)`);
    }

    await prisma.auditLog.create({
      data: {
        gymId,
        actorId: req.userId!,
        actorType: "staff",
        action: "create",
        entity: "staff_users",
        entityId: staff.id,
      },
    });

    return staff;
  }

  async list(gymId: string, query: ListStaffQueryDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    // Managers can only see their own branch
    const branchId = resolveBranchFilter(req, query.branchId);

    const where: Prisma.StaffUserWhereInput = {
      gymId,
      ...(branchId && { branchId }),
      ...(query.role && { role: query.role as "owner" | "manager" | "trainer" | "reception" }),
      ...(query.isActive !== undefined && { isActive: query.isActive !== "false" }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
        ],
      }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.staffUser.findMany({
        where,
        select: STAFF_SELECT,
        orderBy: [{ role: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.staffUser.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(gymId: string, staffId: string, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const staff = await prisma.staffUser.findFirst({
      where: { id: staffId, gymId },
      select: STAFF_SELECT,
    });
    if (!staff) throw new NotFoundException("Staff member not found");

    // Manager: can only view staff in their own branch
    assertBranchAccess(req, staff.branchId);

    return staff;
  }

  async update(gymId: string, staffId: string, dto: UpdateStaffDto, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const existing = await prisma.staffUser.findFirst({ where: { id: staffId, gymId } });
    if (!existing) throw new NotFoundException("Staff member not found");

    if (dto.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: dto.branchId, gymId } });
      if (!branch) throw new NotFoundException("Branch not found");
    }

    const staff = await prisma.staffUser.update({
      where: { id: staffId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.role && { role: dto.role }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.commissionPct !== undefined && { commissionPct: dto.commissionPct }),
      },
      select: STAFF_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        gymId,
        actorId: req.userId!,
        actorType: "staff",
        action: "update",
        entity: "staff_users",
        entityId: staffId,
      },
    });

    return staff;
  }

  async deactivate(gymId: string, staffId: string, req: AuthenticatedRequest) {
    const prisma = getPrismaClient();
    const existing = await prisma.staffUser.findFirst({ where: { id: staffId, gymId } });
    if (!existing) throw new NotFoundException("Staff member not found");
    if (existing.id === req.userId) {
      throw new ForbiddenException("Cannot deactivate your own account");
    }

    await prisma.staffUser.update({
      where: { id: staffId },
      data: { isActive: false },
    });

    // Immediately revoke all active refresh tokens — spec: "immediately invalidates their refresh tokens"
    await this.tokenService.revokeAllUserTokens(staffId, "staff");

    await prisma.auditLog.create({
      data: {
        gymId,
        actorId: req.userId!,
        actorType: "staff",
        action: "delete",
        entity: "staff_users",
        entityId: staffId,
        diff: { isActive: { from: true, to: false } },
      },
    });

    return { deactivated: true };
  }

  async assignTrainer(
    gymId: string,
    memberId: string,
    trainerId: string | null | undefined,
    req: AuthenticatedRequest,
  ) {
    const prisma = getPrismaClient();

    const member = await prisma.member.findFirst({ where: { id: memberId, gymId } });
    if (!member) throw new NotFoundException("Member not found");

    // Manager: can only assign within their branch
    assertBranchAccess(req, member.branchId);

    if (trainerId) {
      const trainer = await prisma.staffUser.findFirst({
        where: { id: trainerId, gymId, role: "trainer", isActive: true },
      });
      if (!trainer) throw new NotFoundException("Trainer not found or inactive");
    }

    await prisma.member.update({
      where: { id: memberId },
      data: { assignedTrainerId: trainerId ?? null },
    });

    await prisma.auditLog.create({
      data: {
        gymId,
        actorId: req.userId!,
        actorType: "staff",
        action: "update",
        entity: "members",
        entityId: memberId,
        diff: { assignedTrainerId: { from: member.assignedTrainerId, to: trainerId ?? null } },
      },
    });

    return { assigned: true };
  }

  async listTrainers(gymId: string) {
    const prisma = getPrismaClient();
    return prisma.staffUser.findMany({
      where: { gymId, role: "trainer", isActive: true },
      select: { id: true, name: true, phone: true, commissionPct: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
  }
}
