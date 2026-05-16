import {
  Controller, Post, Get, Put, Body, Param,
  Query, Req, HttpCode, HttpStatus, ParseUUIDPipe, ParseIntPipe,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CheckinsService } from "./checkins.service";
import { CreateCheckinDto, UpdateCheckinSettingsDto } from "./dto/create-checkin.dto";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@ApiTags("checkins")
@ApiBearerAuth()
@Controller()
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  // ── CHECK-IN (hot path) ───────────────────────────────────────────────────

  @Post("gyms/:gymId/checkins")
  @RequiresPermission("checkins", "create")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Record a check-in — returns within 200ms, writes async" })
  async checkin(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: CreateCheckinDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const result = await this.checkinsService.checkin(gymId, dto, req);
    return { success: true, data: result };
  }

  // ── REPORTS ──────────────────────────────────────────────────────────────

  @Get("gyms/:gymId/checkins/today")
  @RequiresPermission("checkins", "view")
  @ApiOperation({ summary: "Today's check-ins + count + peak hour prediction" })
  async today(@Param("gymId", ParseUUIDPipe) gymId: string, @Req() req: AuthenticatedRequest) {
    this.assertGym(gymId, req);
    const data = await this.checkinsService.getToday(gymId);
    return { success: true, data };
  }

  @Get("gyms/:gymId/checkins/heatmap")
  @RequiresPermission("checkins", "view")
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiOperation({ summary: "Hour × day-of-week heatmap for the last N days" })
  async heatmap(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query("days") days: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.checkinsService.getHeatmap(gymId, parseInt(days ?? "7", 10));
    return { success: true, data };
  }

  @Get("gyms/:gymId/checkins/no-shows")
  @RequiresPermission("checkins", "view")
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiOperation({ summary: "Members who haven't checked in for N days (at-risk list)" })
  async noShows(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query("days") days: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.checkinsService.getNoShows(gymId, parseInt(days ?? "14", 10));
    return { success: true, data };
  }

  @Get("gyms/:gymId/checkins/ticker")
  @RequiresPermission("checkins", "view")
  @ApiOperation({ summary: "Last 10 check-ins for kiosk live ticker" })
  async ticker(@Param("gymId", ParseUUIDPipe) gymId: string, @Req() req: AuthenticatedRequest) {
    this.assertGym(gymId, req);
    const data = await this.checkinsService.getLiveTicker(gymId);
    return { success: true, data };
  }

  @Get("gyms/:gymId/checkins/member/:memberId")
  @RequiresPermission("checkins", "view")
  @ApiOperation({ summary: "Check-in history for a specific member" })
  async memberHistory(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.checkinsService.getMemberHistory(gymId, memberId);
    return { success: true, data };
  }

  // ── SETTINGS ─────────────────────────────────────────────────────────────

  @Get("gyms/:gymId/checkins/settings")
  @RequiresPermission("checkins", "view")
  @ApiOperation({ summary: "Get check-in configuration for this gym" })
  async getSettings(@Param("gymId", ParseUUIDPipe) gymId: string, @Req() req: AuthenticatedRequest) {
    this.assertGym(gymId, req);
    const data = await this.checkinsService.getSettings(gymId);
    return { success: true, data };
  }

  @Put("gyms/:gymId/checkins/settings")
  @RequiresPermission("checkins", "edit")
  @ApiOperation({ summary: "Update check-in settings (allow expired, WhatsApp notification)" })
  async updateSettings(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: UpdateCheckinSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.checkinsService.updateSettings(gymId, dto);
    return { success: true, data };
  }

  private assertGym(gymId: string, req: AuthenticatedRequest) {
    if (req.gymId && req.gymId !== gymId) throw new ForbiddenException("Gym mismatch");
  }
}
