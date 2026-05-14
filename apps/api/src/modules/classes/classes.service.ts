import {
  Injectable, Logger, NotFoundException, BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { Cron, CronExpression } from "@nestjs/schedule";
import { getPrismaClient } from "@grwfit/db";
import { addDays, addMinutes, startOfDay, endOfDay } from "date-fns";
import { WhatsAppModuleService } from "../whatsapp/whatsapp.service";
import type {
  CreateClassTemplateDto, UpdateClassTemplateDto, CreateClassInstanceDto,
  UpdateClassInstanceDto, BookClassDto, ListInstancesQueryDto, UpdateClassSettingsDto,
} from "./dto/classes.dto";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

export const WAITLIST_QUEUE = "class-waitlist";

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);
  private readonly prisma = getPrismaClient();

  constructor(
    private readonly whatsApp: WhatsAppModuleService,
    @InjectQueue(WAITLIST_QUEUE) private readonly waitlistQueue: Queue,
  ) {}

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings(gymId: string) {
    return this.prisma.gymClassSettings.upsert({
      where: { gymId },
      create: { gymId },
      update: {},
    });
  }

  async updateSettings(gymId: string, dto: UpdateClassSettingsDto) {
    return this.prisma.gymClassSettings.upsert({
      where: { gymId },
      create: { gymId, ...dto },
      update: dto,
    });
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async listTemplates(gymId: string) {
    return this.prisma.classTemplate.findMany({
      where: { gymId },
      orderBy: { name: "asc" },
    });
  }

  async createTemplate(gymId: string, dto: CreateClassTemplateDto) {
    return this.prisma.classTemplate.create({
      data: {
        gymId,
        name: dto.name,
        description: dto.description ?? null,
        capacity: dto.capacity,
        durationMin: dto.durationMin,
        trainerId: dto.trainerId ?? null,
        recurrenceRule: dto.recurrenceRule ?? null,
      },
    });
  }

  async updateTemplate(gymId: string, templateId: string, dto: UpdateClassTemplateDto) {
    const tpl = await this.prisma.classTemplate.findFirst({ where: { id: templateId, gymId } });
    if (!tpl) throw new NotFoundException("Template not found");
    return this.prisma.classTemplate.update({ where: { id: templateId }, data: dto });
  }

  async deleteTemplate(gymId: string, templateId: string) {
    const tpl = await this.prisma.classTemplate.findFirst({ where: { id: templateId, gymId } });
    if (!tpl) throw new NotFoundException("Template not found");
    await this.prisma.classTemplate.update({ where: { id: templateId }, data: { isActive: false } });
  }

  // ── Instances ──────────────────────────────────────────────────────────────

  async listInstances(gymId: string, query: ListInstancesQueryDto) {
    const from = query.from ? new Date(query.from) : startOfDay(new Date());
    const to = query.to ? new Date(query.to) : endOfDay(addDays(new Date(), 14));

    return this.prisma.classInstance.findMany({
      where: {
        gymId,
        status: "scheduled",
        startsAt: { gte: from, lte: to },
        ...(query.trainerId && { trainerId: query.trainerId }),
        ...(query.templateId && { templateId: query.templateId }),
      },
      orderBy: { startsAt: "asc" },
      include: {
        template: { select: { name: true, durationMin: true } },
        _count: { select: { bookings: true, waitlist: true } },
      },
    });
  }

  async getInstance(gymId: string, instanceId: string) {
    const instance = await this.prisma.classInstance.findFirst({
      where: { id: instanceId, gymId },
      include: {
        template: true,
        bookings: {
          where: { status: "confirmed" },
          include: { member: { select: { id: true, name: true, phone: true, photoUrl: true } } },
        },
        waitlist: {
          orderBy: { position: "asc" },
          include: { member: { select: { id: true, name: true, phone: true } } },
        },
      },
    });
    if (!instance) throw new NotFoundException("Class not found");
    return instance;
  }

  async createInstance(gymId: string, dto: CreateClassInstanceDto) {
    const template = await this.prisma.classTemplate.findFirst({
      where: { id: dto.templateId, gymId, isActive: true },
    });
    if (!template) throw new NotFoundException("Template not found");

    const startsAt = new Date(dto.startsAt);
    const endsAt = addMinutes(startsAt, template.durationMin);

    return this.prisma.classInstance.create({
      data: {
        gymId,
        templateId: dto.templateId,
        startsAt,
        endsAt,
        capacity: dto.capacity ?? template.capacity,
        trainerId: dto.trainerId ?? template.trainerId,
        status: "scheduled",
      },
    });
  }

  async updateInstance(gymId: string, instanceId: string, dto: UpdateClassInstanceDto) {
    const instance = await this.prisma.classInstance.findFirst({ where: { id: instanceId, gymId } });
    if (!instance) throw new NotFoundException("Class not found");

    // Notify booked members if cancelled
    if (dto.status === "cancelled" && instance.status !== "cancelled") {
      const bookings = await this.prisma.classBooking.findMany({
        where: { instanceId, status: "confirmed" },
        include: { member: { select: { id: true, gymId: true } } },
      });
      for (const b of bookings) {
        void this.whatsApp.fireTrigger(b.member.gymId, "checkin" as never, b.member.id, {}).catch(() => null);
      }
    }

    return this.prisma.classInstance.update({
      where: { id: instanceId },
      data: {
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt), endsAt: addMinutes(new Date(dto.startsAt), 60) }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.trainerId !== undefined && { trainerId: dto.trainerId }),
        ...(dto.status && { status: dto.status as never }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  // ── Booking ────────────────────────────────────────────────────────────────

  async bookClass(gymId: string, dto: BookClassDto, req: AuthenticatedRequest) {
    const memberId = dto.memberId ?? req.userId!;

    const [instance, settings, existing, confirmedCount] = await this.prisma.$transaction([
      this.prisma.classInstance.findFirst({ where: { id: dto.instanceId, gymId, status: "scheduled" } }),
      this.prisma.gymClassSettings.findUnique({ where: { gymId } }),
      this.prisma.classBooking.findFirst({ where: { instanceId: dto.instanceId, memberId } }),
      this.prisma.classBooking.count({ where: { instanceId: dto.instanceId, status: "confirmed" } }),
    ]);

    if (!instance) throw new NotFoundException("Class not found or not scheduled");
    if (existing) throw new ConflictException("Already booked for this class");

    // Check capacity
    if (confirmedCount >= instance.capacity) {
      // Add to waitlist
      const lastPosition = await this.prisma.classWaitlist.aggregate({
        where: { instanceId: dto.instanceId },
        _max: { position: true },
      });
      const position = (lastPosition._max.position ?? 0) + 1;

      const waitlistEntry = await this.prisma.classWaitlist.create({
        data: { gymId, instanceId: dto.instanceId, memberId, position },
      });

      return { status: "waitlisted", position, waitlistId: waitlistEntry.id };
    }

    const booking = await this.prisma.classBooking.create({
      data: { gymId, instanceId: dto.instanceId, memberId, status: "confirmed" },
    });

    // WhatsApp confirmation
    void this.whatsApp.fireTrigger(gymId, "checkin" as never, memberId, {}).catch(() => null);

    return { status: "confirmed", bookingId: booking.id };
  }

  async cancelBooking(gymId: string, instanceId: string, memberId: string) {
    const booking = await this.prisma.classBooking.findFirst({
      where: { instanceId, memberId, gymId, status: "confirmed" },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const instance = await this.prisma.classInstance.findFirst({ where: { id: instanceId } });
    const settings = await this.prisma.gymClassSettings.findUnique({ where: { gymId } });
    const hoursUntil = instance ? (instance.startsAt.getTime() - Date.now()) / 3600000 : 999;
    const cancellationHours = settings?.cancellationHours ?? 2;
    const isLateCancel = hoursUntil < cancellationHours;

    await this.prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    // Auto-promote next on waitlist
    await this.waitlistQueue.add("promote", { gymId, instanceId }, { delay: 2000 });

    return { status: "cancelled", isLateCancel, forfeit: isLateCancel && (settings?.lateCancelForfeits ?? true) };
  }

  async markAttended(gymId: string, instanceId: string, memberIds: string[]) {
    await this.prisma.classBooking.updateMany({
      where: { instanceId, gymId, memberId: { in: memberIds }, status: "confirmed" },
      data: { status: "attended" },
    });
    // Mark no-shows
    await this.prisma.classBooking.updateMany({
      where: { instanceId, gymId, status: "confirmed" },
      data: { status: "no_show" },
    });
    return { updated: memberIds.length };
  }

  async getMemberBookings(gymId: string, memberId: string) {
    return this.prisma.classBooking.findMany({
      where: { gymId, memberId, status: "confirmed" },
      orderBy: { bookedAt: "desc" },
      include: {
        instance: {
          select: { startsAt: true, endsAt: true, template: { select: { name: true } } },
        },
      },
      take: 20,
    });
  }

  // ── Cron: auto-generate instances 30 days ahead ──────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateInstances() {
    const templates = await this.prisma.classTemplate.findMany({
      where: { isActive: true, recurrenceRule: { not: null } },
    });

    this.logger.log(`Generating class instances for ${templates.length} templates`);
    const target = addDays(new Date(), 30);

    for (const tpl of templates) {
      if (!tpl.recurrenceRule) continue;
      // Parse simple RRULE: FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=7;BYMINUTE=0
      const parsed = this.parseSimpleRRule(tpl.recurrenceRule);
      if (!parsed) continue;

      for (const day of this.getMatchingDays(new Date(), target, parsed.byDay)) {
        const startsAt = new Date(day);
        startsAt.setHours(parsed.hour ?? 7, parsed.minute ?? 0, 0, 0);
        const endsAt = addMinutes(startsAt, tpl.durationMin);

        const exists = await this.prisma.classInstance.findFirst({
          where: { templateId: tpl.id, gymId: tpl.gymId, startsAt },
        });
        if (!exists) {
          await this.prisma.classInstance.create({
            data: {
              gymId: tpl.gymId,
              templateId: tpl.id,
              startsAt,
              endsAt,
              capacity: tpl.capacity,
              trainerId: tpl.trainerId,
            },
          }).catch(() => null);
        }
      }
    }
  }

  private parseSimpleRRule(rule: string): { byDay: string[]; hour: number; minute: number } | null {
    try {
      const params = Object.fromEntries(rule.split(";").map((p) => p.split("=")));
      const byDayStr = params["BYDAY"] ?? "";
      const byDay = byDayStr.split(",").filter(Boolean);
      const hour = parseInt(params["BYHOUR"] ?? "7", 10);
      const minute = parseInt(params["BYMINUTE"] ?? "0", 10);
      return { byDay, hour, minute };
    } catch { return null; }
  }

  private getMatchingDays(from: Date, to: Date, byDay: string[]): Date[] {
    const DOW_MAP: Record<string, number> = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };
    const targetDows = new Set(byDay.map((d) => DOW_MAP[d] ?? -1).filter((d) => d >= 0));
    const days: Date[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      if (targetDows.has(cursor.getDay())) days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }
}
