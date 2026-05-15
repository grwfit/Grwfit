import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { ComplianceService } from "./compliance.service";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

class GrantConsentDto {
  @IsArray() types!: Array<"operational" | "marketing" | "analytics">;
}

class DeletionRequestDto {
  @IsOptional() @IsString() reason?: string;
}

class AuditLogQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() actorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}

// ── Staff-facing compliance endpoints ─────────────────────────────────────────

@ApiTags("Compliance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("gyms/:gymId/compliance")
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get("audit-log")
  @ApiOperation({ summary: "Search audit log for this gym" })
  @RequiresPermission("reports", "view")
  searchAuditLog(@Param("gymId") gymId: string, @Query() query: AuditLogQueryDto) {
    return this.service.searchAuditLog(gymId, query);
  }

  @Get("deletion-requests")
  @ApiOperation({ summary: "List pending member data deletion requests" })
  @RequiresPermission("members", "view")
  listDeletionRequests(@Param("gymId") gymId: string) {
    return this.service.listDeletionRequests(gymId);
  }

  @Post("deletion-requests/:requestId/approve")
  @ApiOperation({ summary: "Approve a deletion request — anonymises member PII" })
  @RequiresPermission("members", "delete")
  @HttpCode(HttpStatus.OK)
  approve(
    @Param("gymId") gymId: string,
    @Param("requestId") requestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.approveDeletion(gymId, requestId, req);
  }

  @Post("deletion-requests/:requestId/reject")
  @ApiOperation({ summary: "Reject a deletion request" })
  @RequiresPermission("members", "edit")
  @HttpCode(HttpStatus.OK)
  reject(@Param("gymId") gymId: string, @Param("requestId") requestId: string) {
    return this.service.rejectDeletion(gymId, requestId);
  }
}

// ── Member-facing compliance endpoints (via /members/me) ──────────────────────

@ApiTags("Member Compliance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("members/me/compliance")
export class MemberComplianceController {
  constructor(private readonly service: ComplianceService) {}

  private assertMember(req: AuthenticatedRequest) {
    if (req.userType !== "member") throw new Error("Member only");
    return { memberId: req.userId!, gymId: req.gymId! };
  }

  @Get("consents")
  @ApiOperation({ summary: "Get own consent settings" })
  getConsents(@Req() req: AuthenticatedRequest) {
    const { memberId, gymId } = this.assertMember(req);
    return this.service.getConsents(gymId, memberId);
  }

  @Post("consents/grant")
  @ApiOperation({ summary: "Grant consent(s)" })
  grantConsent(@Req() req: AuthenticatedRequest, @Body() dto: GrantConsentDto) {
    const { memberId, gymId } = this.assertMember(req);
    return this.service.grantConsent(gymId, memberId, dto.types);
  }

  @Post("consents/revoke/:type")
  @ApiOperation({ summary: "Revoke a specific consent" })
  revokeConsent(
    @Req() req: AuthenticatedRequest,
    @Param("type") type: "operational" | "marketing" | "analytics",
  ) {
    const { memberId, gymId } = this.assertMember(req);
    return this.service.revokeConsent(gymId, memberId, type);
  }

  @Post("export")
  @ApiOperation({ summary: "Request own data export (DPDP Right to Access)" })
  requestExport(@Req() req: AuthenticatedRequest) {
    const { memberId, gymId } = this.assertMember(req);
    return this.service.requestDataExport(gymId, memberId);
  }

  @Get("export/status")
  @ApiOperation({ summary: "Check data export status" })
  exportStatus(@Req() req: AuthenticatedRequest) {
    const { memberId, gymId } = this.assertMember(req);
    return this.service.getExportStatus(gymId, memberId);
  }

  @Post("deletion")
  @ApiOperation({ summary: "Request account deletion (DPDP Right to Erasure)" })
  requestDeletion(@Req() req: AuthenticatedRequest, @Body() dto: DeletionRequestDto) {
    const { memberId, gymId } = this.assertMember(req);
    return this.service.requestDeletion(gymId, memberId, dto.reason);
  }
}
