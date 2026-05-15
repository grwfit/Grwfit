import {
  Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { TrainersService } from "./trainers.service";
import type {
  UpdateTrainerProfileDto, AssignTrainerDto,
  ListCommissionsQueryDto, ApproveCommissionsDto, MarkPaidDto,
} from "./dto/trainers.dto";

@ApiTags("Trainers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("gyms/:gymId/trainers")
export class TrainersController {
  constructor(private readonly service: TrainersService) {}

  @Get()
  @ApiOperation({ summary: "List all trainers in the gym" })
  @RequiresPermission("staff_mgmt", "view")
  listTrainers(@Param("gymId") gymId: string) {
    return this.service.listTrainers(gymId);
  }

  @Get("dashboard")
  @ApiOperation({ summary: "Trainer's own dashboard (my members, my commission)" })
  @RequiresPermission("members", "view")
  trainerDashboard(@Param("gymId") gymId: string, @Req() req: AuthenticatedRequest) {
    return this.service.getTrainerDashboard(gymId, req.userId!);
  }

  @Get(":trainerId")
  @ApiOperation({ summary: "Get trainer profile" })
  @RequiresPermission("staff_mgmt", "view")
  getTrainer(@Param("gymId") gymId: string, @Param("trainerId") trainerId: string) {
    return this.service.getTrainer(gymId, trainerId);
  }

  @Put(":trainerId")
  @ApiOperation({ summary: "Update trainer profile (commission %, bio, specializations)" })
  @RequiresPermission("staff_mgmt", "edit")
  updateProfile(
    @Param("gymId") gymId: string,
    @Param("trainerId") trainerId: string,
    @Body() dto: UpdateTrainerProfileDto,
  ) {
    return this.service.updateTrainerProfile(gymId, trainerId, dto);
  }

  @Get(":trainerId/members")
  @ApiOperation({ summary: "Get all members assigned to a trainer" })
  @RequiresPermission("members", "view")
  assignedMembers(@Param("gymId") gymId: string, @Param("trainerId") trainerId: string) {
    return this.service.getAssignedMembers(gymId, trainerId);
  }

  // ── Member assignment ─────────────────────────────────────────────────────

  @Post("assign/:memberId")
  @ApiOperation({ summary: "Assign a trainer to a member" })
  @RequiresPermission("members", "edit")
  assignTrainer(
    @Param("gymId") gymId: string,
    @Param("memberId") memberId: string,
    @Body() dto: AssignTrainerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.assignTrainer(gymId, memberId, dto, req);
  }

  @Delete("assign/:memberId")
  @ApiOperation({ summary: "Remove trainer assignment from a member" })
  @RequiresPermission("members", "edit")
  @HttpCode(HttpStatus.NO_CONTENT)
  unassignTrainer(@Param("gymId") gymId: string, @Param("memberId") memberId: string) {
    return this.service.unassignTrainer(gymId, memberId);
  }

  // ── Commissions ───────────────────────────────────────────────────────────

  @Get("commissions/list")
  @ApiOperation({ summary: "List commissions with filters" })
  @RequiresPermission("commission", "view")
  listCommissions(
    @Param("gymId") gymId: string,
    @Query() query: ListCommissionsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.listCommissions(gymId, query, req);
  }

  @Get("commissions/payout-report")
  @ApiOperation({ summary: "Monthly payout report per trainer" })
  @RequiresPermission("commission", "view")
  payoutReport(@Param("gymId") gymId: string, @Query("month") month: string) {
    const m = month ?? new Date().toISOString().substring(0, 7);
    return this.service.getMonthlyPayoutReport(gymId, m);
  }

  @Post("commissions/approve")
  @ApiOperation({ summary: "Approve commission batch (owner/manager)" })
  @RequiresPermission("commission", "edit")
  approveCommissions(
    @Param("gymId") gymId: string,
    @Body() dto: ApproveCommissionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.approveCommissions(gymId, dto, req);
  }

  @Post("commissions/mark-paid")
  @ApiOperation({ summary: "Mark commissions as paid" })
  @RequiresPermission("commission", "edit")
  markPaid(
    @Param("gymId") gymId: string,
    @Body() dto: MarkPaidDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.markPaid(gymId, dto, req);
  }
}
