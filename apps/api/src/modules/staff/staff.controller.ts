import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { StaffService } from "./staff.service";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";
import { ListStaffQueryDto } from "./dto/list-staff-query.dto";
import { AssignTrainerDto } from "./dto/assign-trainer.dto";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@ApiTags("staff")
@ApiBearerAuth()
@Controller("gyms/:gymId/staff")
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @RequiresPermission("staff_mgmt", "create")
  @ApiOperation({ summary: "Create staff member + send WhatsApp invite (owner only)" })
  @ApiParam({ name: "gymId", type: String })
  async create(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: CreateStaffDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const staff = await this.staffService.create(gymId, dto, req);
    return { success: true, data: staff };
  }

  @Get()
  @RequiresPermission("staff_mgmt", "view")
  @ApiOperation({ summary: "List staff — managers see only their branch" })
  async list(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query() query: ListStaffQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    return this.staffService.list(gymId, query, req);
  }

  @Get("trainers")
  @RequiresPermission("members", "edit")
  @ApiOperation({ summary: "List active trainers for assignment dropdown" })
  async listTrainers(@Param("gymId", ParseUUIDPipe) gymId: string, @Req() req: AuthenticatedRequest) {
    this.assertGymAccess(gymId, req);
    const trainers = await this.staffService.listTrainers(gymId);
    return { success: true, data: trainers };
  }

  @Get(":staffId")
  @RequiresPermission("staff_mgmt", "view")
  @ApiOperation({ summary: "Get single staff member" })
  async findOne(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("staffId", ParseUUIDPipe) staffId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const staff = await this.staffService.findOne(gymId, staffId, req);
    return { success: true, data: staff };
  }

  @Put(":staffId")
  @RequiresPermission("staff_mgmt", "edit")
  @ApiOperation({ summary: "Update staff member (owner only)" })
  async update(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("staffId", ParseUUIDPipe) staffId: string,
    @Body() dto: UpdateStaffDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const staff = await this.staffService.update(gymId, staffId, dto, req);
    return { success: true, data: staff };
  }

  @Delete(":staffId")
  @RequiresPermission("staff_mgmt", "delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate staff (soft delete) + immediately revoke tokens (owner only)" })
  async deactivate(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("staffId", ParseUUIDPipe) staffId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const result = await this.staffService.deactivate(gymId, staffId, req);
    return { success: true, data: result };
  }

  @Patch(":memberId/assign-trainer")
  @RequiresPermission("members", "edit")
  @ApiOperation({ summary: "Assign or unassign trainer to a member (owner/manager)" })
  async assignTrainer(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: AssignTrainerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const result = await this.staffService.assignTrainer(gymId, memberId, dto.trainerId, req);
    return { success: true, data: result };
  }

  /** Prevent access to another gym's staff via URL manipulation */
  private assertGymAccess(gymId: string, req: AuthenticatedRequest): void {
    if (req.gymId && req.gymId !== gymId) {
      throw new ForbiddenException("Gym mismatch");
    }
  }
}
