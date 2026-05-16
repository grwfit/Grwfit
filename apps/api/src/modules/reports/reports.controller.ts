import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { ReportsService } from "./reports.service";
import { ReportsFilterDto, AttendanceReportDto } from "./dto/reports.dto";

@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("gyms/:gymId/reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get("revenue")
  @ApiOperation({ summary: "Revenue report with daily series, plan/mode breakdown, growth vs prev period" })
  @RequiresPermission("reports", "view")
  revenue(@Param("gymId") gymId: string, @Query() query: ReportsFilterDto) {
    return this.service.getRevenueReport(gymId, query);
  }

  @Get("members")
  @ApiOperation({ summary: "Member report: status counts, new signups, churn, demographics" })
  @RequiresPermission("reports", "view")
  members(@Param("gymId") gymId: string, @Query() query: ReportsFilterDto) {
    return this.service.getMemberReport(gymId, query);
  }

  @Get("members/cohort-retention")
  @ApiOperation({ summary: "Cohort retention chart data (last N months)" })
  @RequiresPermission("reports", "view")
  cohortRetention(@Param("gymId") gymId: string, @Query("months") months?: string) {
    return this.service.getCohortRetention(gymId, months ? parseInt(months, 10) : 6);
  }

  @Get("attendance")
  @ApiOperation({ summary: "Attendance: daily trend, peak-hour heatmap, at-risk members" })
  @RequiresPermission("reports", "view")
  attendance(@Param("gymId") gymId: string, @Query() query: AttendanceReportDto) {
    return this.service.getAttendanceReport(gymId, query);
  }

  @Get("trainers")
  @ApiOperation({ summary: "Trainer performance: member count, retention, commission" })
  @RequiresPermission("reports", "view")
  trainerPerformance(@Param("gymId") gymId: string, @Query() query: ReportsFilterDto) {
    return this.service.getTrainerPerformance(gymId, query);
  }

  @Get("gst-summary")
  @ApiOperation({ summary: "GST summary report for CA/accountant export" })
  @RequiresPermission("reports", "view")
  gstSummary(@Param("gymId") gymId: string, @Query() query: ReportsFilterDto) {
    return this.service.getGstSummary(gymId, query);
  }
}
