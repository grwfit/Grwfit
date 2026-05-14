import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import { Prisma } from "@grwfit/db";
import type {
  CreateWorkoutTemplateDto, CreateWorkoutPlanDto, UpdateWorkoutPlanDto,
  CreateDietPlanDto, UpdateDietPlanDto, LogProgressDto,
} from "./dto/plans.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);
  private readonly prisma = getPrismaClient();

  // ── Workout templates ─────────────────────────────────────────────────────

  async listWorkoutTemplates(gymId: string) {
    return this.prisma.workoutTemplate.findMany({
      where: { gymId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async createWorkoutTemplate(gymId: string, dto: CreateWorkoutTemplateDto, req: AuthenticatedRequest) {
    return this.prisma.workoutTemplate.create({
      data: {
        gymId,
        name: dto.name,
        category: dto.category ?? "general",
        exercises: dto.exercises as Prisma.InputJsonValue,
        isPublic: dto.isPublic ?? false,
        createdBy: req.userId ?? null,
      },
    });
  }

  async deleteWorkoutTemplate(gymId: string, templateId: string) {
    const tpl = await this.prisma.workoutTemplate.findFirst({ where: { id: templateId, gymId } });
    if (!tpl) throw new NotFoundException("Template not found");
    await this.prisma.workoutTemplate.delete({ where: { id: templateId } });
  }

  // ── Workout plans ─────────────────────────────────────────────────────────

  async getMemberWorkoutPlan(gymId: string, memberId: string) {
    return this.prisma.workoutPlan.findFirst({
      where: { gymId, memberId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listMemberWorkoutPlans(gymId: string, memberId: string) {
    return this.prisma.workoutPlan.findMany({
      where: { gymId, memberId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createWorkoutPlan(gymId: string, dto: CreateWorkoutPlanDto, req: AuthenticatedRequest) {
    const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, gymId } });
    if (!member) throw new NotFoundException("Member not found");

    // Trainers can only create plans for their assigned members
    if (req.userRole === "trainer" && member.assignedTrainerId !== req.userId) {
      throw new ForbiddenException("You can only create plans for your assigned members");
    }

    // Deactivate existing active plan
    await this.prisma.workoutPlan.updateMany({
      where: { gymId, memberId: dto.memberId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.workoutPlan.create({
      data: {
        gymId,
        memberId: dto.memberId,
        trainerId: req.userId ?? null,
        name: dto.name,
        week: dto.week as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  async updateWorkoutPlan(gymId: string, planId: string, dto: UpdateWorkoutPlanDto) {
    const plan = await this.prisma.workoutPlan.findFirst({ where: { id: planId, gymId } });
    if (!plan) throw new NotFoundException("Plan not found");

    return this.prisma.workoutPlan.update({
      where: { id: planId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.week && { week: dto.week as Prisma.InputJsonValue }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ── Diet plans ────────────────────────────────────────────────────────────

  async getMemberDietPlan(gymId: string, memberId: string) {
    return this.prisma.dietPlan.findFirst({
      where: { gymId, memberId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDietPlan(gymId: string, dto: CreateDietPlanDto, req: AuthenticatedRequest) {
    const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, gymId } });
    if (!member) throw new NotFoundException("Member not found");

    if (req.userRole === "trainer" && member.assignedTrainerId !== req.userId) {
      throw new ForbiddenException("You can only create plans for your assigned members");
    }

    await this.prisma.dietPlan.updateMany({
      where: { gymId, memberId: dto.memberId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.dietPlan.create({
      data: {
        gymId,
        memberId: dto.memberId,
        trainerId: req.userId ?? null,
        meals: dto.meals as Prisma.InputJsonValue,
        calories: dto.calories ?? null,
        macros: dto.macros ? (dto.macros as Prisma.InputJsonValue) : Prisma.JsonNull,
        isActive: true,
      },
    });
  }

  async updateDietPlan(gymId: string, planId: string, dto: UpdateDietPlanDto) {
    const plan = await this.prisma.dietPlan.findFirst({ where: { id: planId, gymId } });
    if (!plan) throw new NotFoundException("Diet plan not found");

    return this.prisma.dietPlan.update({
      where: { id: planId },
      data: {
        ...(dto.meals && { meals: dto.meals as Prisma.InputJsonValue }),
        ...(dto.calories !== undefined && { calories: dto.calories }),
        ...(dto.macros !== undefined && { macros: dto.macros ? (dto.macros as Prisma.InputJsonValue) : Prisma.JsonNull }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ── Progress logs ─────────────────────────────────────────────────────────

  async logProgress(gymId: string, dto: LogProgressDto, req: AuthenticatedRequest) {
    const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, gymId } });
    if (!member) throw new NotFoundException("Member not found");

    return this.prisma.progressLog.create({
      data: {
        gymId,
        memberId: dto.memberId,
        weightGrams: dto.weightGrams ?? null,
        measurements: dto.measurements ? (dto.measurements as Prisma.InputJsonValue) : Prisma.JsonNull,
        photoUrls: dto.photoUrls ?? [],
        notes: dto.notes ?? null,
      },
    });
  }

  async getProgressLogs(gymId: string, memberId: string, limit = 30) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, gymId } });
    if (!member) throw new NotFoundException("Member not found");

    return this.prisma.progressLog.findMany({
      where: { gymId, memberId },
      orderBy: { loggedAt: "desc" },
      take: limit,
    });
  }

  // ── Trainer plan overview ─────────────────────────────────────────────────

  async getTrainerPlansOverview(gymId: string, trainerId: string) {
    const [members, pendingUpdates] = await Promise.all([
      this.prisma.member.findMany({
        where: { gymId, assignedTrainerId: trainerId, deletedAt: null },
        select: { id: true, name: true, photoUrl: true },
      }),
      this.prisma.workoutPlan.findMany({
        where: { gymId, trainerId, isActive: true },
        select: { memberId: true, updatedAt: true },
      }),
    ]);

    const planMap = new Map(pendingUpdates.map((p) => [p.memberId, p.updatedAt]));

    return members.map((m) => ({
      ...m,
      hasActivePlan: planMap.has(m.id),
      lastPlanUpdate: planMap.get(m.id) ?? null,
    }));
  }
}
