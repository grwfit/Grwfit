import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { LeadsService } from "./leads.service";
import type {
  CreateLeadDto, UpdateLeadDto, MoveLeadDto, LostLeadDto,
  ConvertLeadDto, AddLeadActivityDto, ListLeadsQueryDto,
  CreateLeadStageDto, UpdateLeadStageDto, ReorderStagesDto,
} from "./dto/leads.dto";

@ApiTags("Leads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("api/v1/gyms/:gymId/leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ── Stages ────────────────────────────────────────────────────────────────

  @Get("stages")
  @ApiOperation({ summary: "List pipeline stages for this gym" })
  @RequiresPermission("leads", "view")
  getStages(@Param("gymId") gymId: string) {
    return this.leadsService.getStages(gymId);
  }

  @Post("stages")
  @ApiOperation({ summary: "Create a pipeline stage" })
  @RequiresPermission("leads", "create")
  createStage(@Param("gymId") gymId: string, @Body() dto: CreateLeadStageDto) {
    return this.leadsService.createStage(gymId, dto);
  }

  @Put("stages/:stageId")
  @ApiOperation({ summary: "Update a pipeline stage" })
  @RequiresPermission("leads", "edit")
  updateStage(
    @Param("gymId") gymId: string,
    @Param("stageId") stageId: string,
    @Body() dto: UpdateLeadStageDto,
  ) {
    return this.leadsService.updateStage(gymId, stageId, dto);
  }

  @Delete("stages/:stageId")
  @ApiOperation({ summary: "Delete a pipeline stage (must be empty)" })
  @RequiresPermission("leads", "delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStage(@Param("gymId") gymId: string, @Param("stageId") stageId: string) {
    return this.leadsService.deleteStage(gymId, stageId);
  }

  @Patch("stages/reorder")
  @ApiOperation({ summary: "Reorder stages (drag-drop)" })
  @RequiresPermission("leads", "edit")
  reorderStages(@Param("gymId") gymId: string, @Body() dto: ReorderStagesDto) {
    return this.leadsService.reorderStages(gymId, dto);
  }

  // ── Kanban board ──────────────────────────────────────────────────────────

  @Get("kanban")
  @ApiOperation({ summary: "Get Kanban board — stages with leads grouped" })
  @RequiresPermission("leads", "view")
  getKanban(@Param("gymId") gymId: string) {
    return this.leadsService.getKanban(gymId);
  }

  // ── Leads CRUD ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: "List leads with filters + pagination" })
  @RequiresPermission("leads", "view")
  listLeads(@Param("gymId") gymId: string, @Query() query: ListLeadsQueryDto) {
    return this.leadsService.listLeads(gymId, query);
  }

  @Post()
  @ApiOperation({ summary: "Create a lead" })
  @RequiresPermission("leads", "create")
  createLead(
    @Param("gymId") gymId: string,
    @Body() dto: CreateLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadsService.createLead(gymId, dto, req);
  }

  @Get(":leadId")
  @ApiOperation({ summary: "Get lead detail with activity timeline" })
  @RequiresPermission("leads", "view")
  getLead(@Param("gymId") gymId: string, @Param("leadId") leadId: string) {
    return this.leadsService.getLead(gymId, leadId);
  }

  @Put(":leadId")
  @ApiOperation({ summary: "Update lead" })
  @RequiresPermission("leads", "edit")
  updateLead(
    @Param("gymId") gymId: string,
    @Param("leadId") leadId: string,
    @Body() dto: UpdateLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadsService.updateLead(gymId, leadId, dto, req);
  }

  @Patch(":leadId/move")
  @ApiOperation({ summary: "Move lead to a different stage" })
  @RequiresPermission("leads", "edit")
  moveLead(
    @Param("gymId") gymId: string,
    @Param("leadId") leadId: string,
    @Body() dto: MoveLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadsService.moveLead(gymId, leadId, dto, req);
  }

  @Patch(":leadId/lost")
  @ApiOperation({ summary: "Mark lead as lost" })
  @RequiresPermission("leads", "edit")
  markLost(
    @Param("gymId") gymId: string,
    @Param("leadId") leadId: string,
    @Body() dto: LostLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadsService.markLost(gymId, leadId, dto, req);
  }

  @Post(":leadId/convert")
  @ApiOperation({ summary: "Convert lead to member (one-click)" })
  @RequiresPermission("leads", "create")
  convertToMember(
    @Param("gymId") gymId: string,
    @Param("leadId") leadId: string,
    @Body() dto: ConvertLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadsService.convertToMember(gymId, leadId, dto, req);
  }

  // ── Activities ────────────────────────────────────────────────────────────

  @Post(":leadId/activities")
  @ApiOperation({ summary: "Log an activity on a lead" })
  @RequiresPermission("leads", "create")
  addActivity(
    @Param("gymId") gymId: string,
    @Param("leadId") leadId: string,
    @Body() dto: AddLeadActivityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadsService.addActivity(gymId, leadId, dto, req);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get("reports/funnel")
  @ApiOperation({ summary: "Conversion funnel by source + time-to-convert" })
  @RequiresPermission("leads", "view")
  getFunnel(@Param("gymId") gymId: string, @Query("days") days?: string) {
    return this.leadsService.getFunnelReport(gymId, days ? parseInt(days, 10) : 30);
  }
}
