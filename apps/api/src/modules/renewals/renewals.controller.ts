import {
  Controller, Get, Post, Put, Body, Param,
  Query, Req, Res, HttpCode, HttpStatus, ParseUUIDPipe,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import type { Response } from "express";
import { RenewalsService } from "./renewals.service";
import {
  RenewalsDashboardQueryDto, SendReminderDto, BulkReminderDto,
  MarkContactedDto, UpdateRenewalConfigDto, UpsertTemplateDto,
} from "./dto/renewals.dto";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@ApiTags("renewals")
@ApiBearerAuth()
@Controller("gyms/:gymId/renewals")
export class RenewalsController {
  constructor(private readonly renewalsService: RenewalsService) {}

  // ── DASHBOARD ─────────────────────────────────────────────────────────────

  @Get()
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "Renewals dashboard — bucket summary + member list" })
  async dashboard(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query() query: RenewalsDashboardQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.renewalsService.getDashboard(gymId, query);
    return { success: true, data };
  }

  // ── SEND REMINDER ─────────────────────────────────────────────────────────

  @Post("remind")
  @RequiresPermission("members", "edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send WhatsApp reminder to a single member" })
  async sendReminder(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: SendReminderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const result = await this.renewalsService.sendReminder(gymId, dto, req);
    return { success: true, data: result };
  }

  // ── BULK REMINDER ─────────────────────────────────────────────────────────

  @Post("remind/bulk")
  @RequiresPermission("members", "edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk send WhatsApp reminders — queues BullMQ job, returns in <500ms" })
  async sendBulkReminders(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: BulkReminderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const result = await this.renewalsService.sendBulkReminders(gymId, dto, req);
    return { success: true, data: result };
  }

  // ── MARK CONTACTED ────────────────────────────────────────────────────────

  @Post("follow-up")
  @RequiresPermission("members", "edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log a call/contact outcome and optionally schedule follow-up" })
  async markContacted(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: MarkContactedDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.renewalsService.markContacted(gymId, dto, req);
    return { success: true, data };
  }

  // ── FOLLOW-UP PIPELINE ────────────────────────────────────────────────────

  @Get("follow-ups")
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "Follow-up pipeline — members contacted but not renewed" })
  async getFollowUps(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query("page") page: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.renewalsService.getFollowUps(gymId, parseInt(page ?? "1", 10));
    return { success: true, data };
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────

  @Get("export")
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "Export renewal bucket as CSV" })
  async exportCsv(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query() query: RenewalsDashboardQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.assertGym(gymId, req);
    const csv = await this.renewalsService.exportCsv(gymId, query.bucket ?? "week", query);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="renewals-${query.bucket ?? "week"}.csv"`);
    res.send(csv);
  }

  // ── CONFIG ────────────────────────────────────────────────────────────────

  @Get("config")
  @RequiresPermission("dashboard", "view")
  @ApiOperation({ summary: "Get renewal reminder configuration for this gym" })
  async getConfig(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.renewalsService.getRenewalConfigs(gymId);
    return { success: true, data };
  }

  @Put("config/:triggerType")
  @RequiresPermission("dashboard", "view")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toggle/update a reminder type (owner only)" })
  async updateConfig(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("triggerType") triggerType: string,
    @Body() dto: UpdateRenewalConfigDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.renewalsService.updateRenewalConfig(gymId, triggerType, dto);
    return { success: true, data };
  }

  // ── TEMPLATES ─────────────────────────────────────────────────────────────

  @Get("templates")
  @RequiresPermission("dashboard", "view")
  @ApiOperation({ summary: "List WhatsApp templates for this gym" })
  async listTemplates(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.renewalsService.listTemplates(gymId);
    return { success: true, data };
  }

  @Post("templates")
  @RequiresPermission("dashboard", "view")
  @ApiOperation({ summary: "Create a new WhatsApp template" })
  async createTemplate(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: UpsertTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.renewalsService.upsertTemplate(gymId, dto, req);
    return { success: true, data };
  }

  private assertGym(gymId: string, req: AuthenticatedRequest) {
    if (req.gymId && req.gymId !== gymId) throw new ForbiddenException("Gym mismatch");
  }
}
