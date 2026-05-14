import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { PlansService } from "./plans.service";
import type {
  CreateWorkoutTemplateDto, CreateWorkoutPlanDto, UpdateWorkoutPlanDto,
  CreateDietPlanDto, UpdateDietPlanDto, LogProgressDto,
} from "./dto/plans.dto";

@ApiTags("Plans")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("api/v1/gyms/:gymId/plans")
export class PlansController {
  constructor(private readonly service: PlansService) {}

  // ── Workout templates ─────────────────────────────────────────────────────

  @Get("workout-templates")
  @ApiOperation({ summary: "List workout templates" })
  @RequiresPermission("workout_diet", "view")
  listTemplates(@Param("gymId") gymId: string) {
    return this.service.listWorkoutTemplates(gymId);
  }

  @Post("workout-templates")
  @ApiOperation({ summary: "Create a workout template" })
  @RequiresPermission("workout_diet", "create")
  createTemplate(
    @Param("gymId") gymId: string,
    @Body() dto: CreateWorkoutTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createWorkoutTemplate(gymId, dto, req);
  }

  @Delete("workout-templates/:templateId")
  @ApiOperation({ summary: "Delete a workout template" })
  @RequiresPermission("workout_diet", "delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(@Param("gymId") gymId: string, @Param("templateId") templateId: string) {
    return this.service.deleteWorkoutTemplate(gymId, templateId);
  }

  // ── Workout plans ─────────────────────────────────────────────────────────

  @Get("workout/:memberId")
  @ApiOperation({ summary: "Get active workout plan for a member" })
  @RequiresPermission("workout_diet", "view")
  getWorkoutPlan(@Param("gymId") gymId: string, @Param("memberId") memberId: string) {
    return this.service.getMemberWorkoutPlan(gymId, memberId);
  }

  @Get("workout/:memberId/all")
  @ApiOperation({ summary: "List all workout plans for a member" })
  @RequiresPermission("workout_diet", "view")
  listWorkoutPlans(@Param("gymId") gymId: string, @Param("memberId") memberId: string) {
    return this.service.listMemberWorkoutPlans(gymId, memberId);
  }

  @Post("workout")
  @ApiOperation({ summary: "Create a workout plan for a member" })
  @RequiresPermission("workout_diet", "create")
  createWorkoutPlan(
    @Param("gymId") gymId: string,
    @Body() dto: CreateWorkoutPlanDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createWorkoutPlan(gymId, dto, req);
  }

  @Put("workout/:planId")
  @ApiOperation({ summary: "Update a workout plan" })
  @RequiresPermission("workout_diet", "edit")
  updateWorkoutPlan(
    @Param("gymId") gymId: string,
    @Param("planId") planId: string,
    @Body() dto: UpdateWorkoutPlanDto,
  ) {
    return this.service.updateWorkoutPlan(gymId, planId, dto);
  }

  // ── Diet plans ────────────────────────────────────────────────────────────

  @Get("diet/:memberId")
  @ApiOperation({ summary: "Get active diet plan for a member" })
  @RequiresPermission("workout_diet", "view")
  getDietPlan(@Param("gymId") gymId: string, @Param("memberId") memberId: string) {
    return this.service.getMemberDietPlan(gymId, memberId);
  }

  @Post("diet")
  @ApiOperation({ summary: "Create a diet plan for a member" })
  @RequiresPermission("workout_diet", "create")
  createDietPlan(
    @Param("gymId") gymId: string,
    @Body() dto: CreateDietPlanDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createDietPlan(gymId, dto, req);
  }

  @Put("diet/:planId")
  @ApiOperation({ summary: "Update a diet plan" })
  @RequiresPermission("workout_diet", "edit")
  updateDietPlan(
    @Param("gymId") gymId: string,
    @Param("planId") planId: string,
    @Body() dto: UpdateDietPlanDto,
  ) {
    return this.service.updateDietPlan(gymId, planId, dto);
  }

  // ── Progress logs ─────────────────────────────────────────────────────────

  @Post("progress")
  @ApiOperation({ summary: "Log member progress (weight, measurements, photos)" })
  @RequiresPermission("workout_diet", "create")
  logProgress(
    @Param("gymId") gymId: string,
    @Body() dto: LogProgressDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.logProgress(gymId, dto, req);
  }

  @Get("progress/:memberId")
  @ApiOperation({ summary: "Get progress log history for a member" })
  @RequiresPermission("workout_diet", "view")
  getProgress(
    @Param("gymId") gymId: string,
    @Param("memberId") memberId: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.getProgressLogs(gymId, memberId, limit ? parseInt(limit, 10) : 30);
  }

  // ── Trainer overview ──────────────────────────────────────────────────────

  @Get("trainer-overview/:trainerId")
  @ApiOperation({ summary: "Plans status overview for all of a trainer's members" })
  @RequiresPermission("workout_diet", "view")
  trainerOverview(@Param("gymId") gymId: string, @Param("trainerId") trainerId: string) {
    return this.service.getTrainerPlansOverview(gymId, trainerId);
  }
}
