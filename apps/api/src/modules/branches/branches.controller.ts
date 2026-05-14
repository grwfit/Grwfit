import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { BranchesService } from "./branches.service";
import { CreateBranchDto, UpdateBranchDto } from "./dto/create-branch.dto";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@ApiTags("branches")
@ApiBearerAuth()
@Controller("gyms/:gymId/branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequiresPermission("dashboard", "view")
  @ApiOperation({ summary: "List all branches" })
  async list(@Param("gymId", ParseUUIDPipe) gymId: string, @Req() req: AuthenticatedRequest) {
    this.assertGymAccess(gymId, req);
    const branches = await this.branchesService.list(gymId);
    return { success: true, data: branches };
  }

  @Post()
  @RequiresPermission("staff_mgmt", "create")
  @ApiOperation({ summary: "Create branch (owner only)" })
  async create(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: CreateBranchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const branch = await this.branchesService.create(gymId, dto, req.userId!);
    return { success: true, data: branch };
  }

  @Put(":branchId")
  @RequiresPermission("staff_mgmt", "edit")
  @ApiOperation({ summary: "Update branch (owner only)" })
  async update(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("branchId", ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const branch = await this.branchesService.update(gymId, branchId, dto, req.userId!);
    return { success: true, data: branch };
  }

  @Delete(":branchId")
  @RequiresPermission("staff_mgmt", "delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete branch (owner only, not primary)" })
  async delete(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("branchId", ParseUUIDPipe) branchId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGymAccess(gymId, req);
    const result = await this.branchesService.delete(gymId, branchId, req.userId!);
    return { success: true, data: result };
  }

  private assertGymAccess(gymId: string, req: AuthenticatedRequest): void {
    if (req.gymId && req.gymId !== gymId) throw new Error("Forbidden: gym mismatch");
  }
}
