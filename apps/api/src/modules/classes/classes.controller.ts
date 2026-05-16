import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param,
  Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { ClassesService } from "./classes.service";
import {
  CreateClassTemplateDto, UpdateClassTemplateDto, CreateClassInstanceDto,
  UpdateClassInstanceDto, BookClassDto, ListInstancesQueryDto, UpdateClassSettingsDto,
} from "./dto/classes.dto";

@ApiTags("Classes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("gyms/:gymId/classes")
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  // ── Settings ───────────────────────────────────────────────────────────────

  @Get("settings")
  @RequiresPermission("dashboard", "view")
  getSettings(@Param("gymId") gymId: string) {
    return this.service.getSettings(gymId);
  }

  @Put("settings")
  @RequiresPermission("dashboard", "edit")
  updateSettings(@Param("gymId") gymId: string, @Body() dto: UpdateClassSettingsDto) {
    return this.service.updateSettings(gymId, dto);
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  @Get("templates")
  @ApiOperation({ summary: "List class templates" })
  @RequiresPermission("dashboard", "view")
  listTemplates(@Param("gymId") gymId: string) {
    return this.service.listTemplates(gymId);
  }

  @Post("templates")
  @ApiOperation({ summary: "Create a class template" })
  @RequiresPermission("dashboard", "create")
  createTemplate(@Param("gymId") gymId: string, @Body() dto: CreateClassTemplateDto) {
    return this.service.createTemplate(gymId, dto);
  }

  @Put("templates/:templateId")
  @ApiOperation({ summary: "Update a class template" })
  @RequiresPermission("dashboard", "edit")
  updateTemplate(
    @Param("gymId") gymId: string,
    @Param("templateId") templateId: string,
    @Body() dto: UpdateClassTemplateDto,
  ) {
    return this.service.updateTemplate(gymId, templateId, dto);
  }

  @Delete("templates/:templateId")
  @ApiOperation({ summary: "Deactivate a class template" })
  @RequiresPermission("dashboard", "delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(@Param("gymId") gymId: string, @Param("templateId") templateId: string) {
    return this.service.deleteTemplate(gymId, templateId);
  }

  // ── Instances ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: "List upcoming class instances" })
  @RequiresPermission("dashboard", "view")
  listInstances(@Param("gymId") gymId: string, @Query() query: ListInstancesQueryDto) {
    return this.service.listInstances(gymId, query);
  }

  @Post()
  @ApiOperation({ summary: "Create a one-off class instance" })
  @RequiresPermission("dashboard", "create")
  createInstance(@Param("gymId") gymId: string, @Body() dto: CreateClassInstanceDto) {
    return this.service.createInstance(gymId, dto);
  }

  @Get(":instanceId")
  @ApiOperation({ summary: "Get class instance detail with roster and waitlist" })
  @RequiresPermission("dashboard", "view")
  getInstance(@Param("gymId") gymId: string, @Param("instanceId") instanceId: string) {
    return this.service.getInstance(gymId, instanceId);
  }

  @Put(":instanceId")
  @ApiOperation({ summary: "Update instance (reschedule / cancel)" })
  @RequiresPermission("dashboard", "edit")
  updateInstance(
    @Param("gymId") gymId: string,
    @Param("instanceId") instanceId: string,
    @Body() dto: UpdateClassInstanceDto,
  ) {
    return this.service.updateInstance(gymId, instanceId, dto);
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  @Post("book")
  @ApiOperation({ summary: "Book a class (staff on behalf of member, or member direct)" })
  @RequiresPermission("checkins", "create")
  bookClass(
    @Param("gymId") gymId: string,
    @Body() dto: BookClassDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.bookClass(gymId, dto, req);
  }

  @Delete(":instanceId/bookings/:memberId")
  @ApiOperation({ summary: "Cancel a booking — auto-promotes waitlist" })
  @RequiresPermission("checkins", "edit")
  @HttpCode(HttpStatus.OK)
  cancelBooking(
    @Param("gymId") gymId: string,
    @Param("instanceId") instanceId: string,
    @Param("memberId") memberId: string,
  ) {
    return this.service.cancelBooking(gymId, instanceId, memberId);
  }

  @Patch(":instanceId/attendance")
  @ApiOperation({ summary: "Mark attendance for a class" })
  @RequiresPermission("checkins", "edit")
  markAttended(
    @Param("gymId") gymId: string,
    @Param("instanceId") instanceId: string,
    @Body("memberIds") memberIds: string[],
  ) {
    return this.service.markAttended(gymId, instanceId, memberIds);
  }

  @Get("member/:memberId/bookings")
  @ApiOperation({ summary: "Get upcoming bookings for a member" })
  @RequiresPermission("members", "view")
  getMemberBookings(
    @Param("gymId") gymId: string,
    @Param("memberId") memberId: string,
  ) {
    return this.service.getMemberBookings(gymId, memberId);
  }
}
