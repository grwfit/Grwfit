import {
  Controller, Get, Post, Body, Param, Query, Req,
  UseGuards, UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { PlatformService } from "./platform.service";
import { ListGymsQueryDto, ImpersonateDto, AuditLogQueryDto } from "./dto/platform.dto";

// All routes require a platform JWT (type === "platform")
function assertPlatform(req: AuthenticatedRequest) {
  if (req.userType !== "platform") throw new UnauthorizedException("Platform access only");
  return req.userId!;
}

@ApiTags("Platform Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin/platform")
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get("overview")
  @ApiOperation({ summary: "Platform overview: MRR, ARR, gym counts, recent signups" })
  overview(@Req() req: AuthenticatedRequest) {
    assertPlatform(req);
    return this.service.getOverview();
  }

  @Get("gyms")
  @ApiOperation({ summary: "List all gyms with search, filter, health score" })
  listGyms(@Req() req: AuthenticatedRequest, @Query() query: ListGymsQueryDto) {
    assertPlatform(req);
    return this.service.listGyms(query);
  }

  @Get("gyms/:gymId")
  @ApiOperation({ summary: "Gym detail with revenue, members, recent audit log" })
  getGym(@Req() req: AuthenticatedRequest, @Param("gymId") gymId: string) {
    assertPlatform(req);
    return this.service.getGymDetail(gymId);
  }

  @Post("gyms/:gymId/impersonate")
  @ApiOperation({ summary: "Impersonate a gym owner — returns short-lived JWT" })
  impersonate(
    @Req() req: AuthenticatedRequest,
    @Param("gymId") gymId: string,
    @Body() dto: ImpersonateDto,
  ) {
    const platformUserId = assertPlatform(req);
    return this.service.impersonate(gymId, platformUserId, dto);
  }

  @Get("audit-log")
  @ApiOperation({ summary: "Search audit log across all gyms" })
  auditLog(@Req() req: AuthenticatedRequest, @Query() query: AuditLogQueryDto) {
    assertPlatform(req);
    return this.service.getAuditLog(query);
  }

  @Get("onboarding")
  @ApiOperation({ summary: "Trial gyms with setup checklist progress" })
  onboarding(@Req() req: AuthenticatedRequest) {
    assertPlatform(req);
    return this.service.getOnboardingPipeline();
  }
}
