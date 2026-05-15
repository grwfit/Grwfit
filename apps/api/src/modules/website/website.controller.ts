import {
  Controller, Get, Put, Post, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { WebsiteService } from "./website.service";
import type {
  UpdateWebsiteContentDto, ConnectDomainDto, TrialBookingDto,
} from "./dto/website.dto";

@ApiTags("Website")
@Controller("")
export class WebsiteController {
  constructor(private readonly service: WebsiteService) {}

  // ── Staff-facing (authenticated) ─────────────────────────────────────────

  @Get("gyms/:gymId/website")
  @ApiOperation({ summary: "Get website config + live plan/trainer data" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequiresPermission("website_cms", "view")
  getWebsite(@Param("gymId") gymId: string) {
    return this.service.getWebsite(gymId);
  }

  @Put("gyms/:gymId/website")
  @ApiOperation({ summary: "Update website content / template / SEO meta" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequiresPermission("website_cms", "edit")
  updateWebsite(@Param("gymId") gymId: string, @Body() dto: UpdateWebsiteContentDto) {
    return this.service.updateWebsite(gymId, dto);
  }

  @Post("gyms/:gymId/website/publish")
  @ApiOperation({ summary: "Publish the website (make it publicly accessible)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequiresPermission("website_cms", "edit")
  publishWebsite(@Param("gymId") gymId: string) {
    return this.service.publishWebsite(gymId);
  }

  @Post("gyms/:gymId/website/unpublish")
  @ApiOperation({ summary: "Unpublish (take offline)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequiresPermission("website_cms", "edit")
  unpublishWebsite(@Param("gymId") gymId: string) {
    return this.service.unpublishWebsite(gymId);
  }

  @Post("gyms/:gymId/website/connect-domain")
  @ApiOperation({ summary: "Connect a custom domain via Cloudflare for SaaS" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequiresPermission("website_cms", "edit")
  connectDomain(@Param("gymId") gymId: string, @Body() dto: ConnectDomainDto) {
    return this.service.connectDomain(gymId, dto);
  }

  @Get("gyms/:gymId/website/domain-status")
  @ApiOperation({ summary: "Poll Cloudflare SSL status for the custom domain" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequiresPermission("website_cms", "view")
  checkDomain(@Param("gymId") gymId: string) {
    return this.service.checkDomainSsl(gymId);
  }

  @Get("gyms/:gymId/website/analytics")
  @ApiOperation({ summary: "Page view + lead conversion analytics for the gym site" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequiresPermission("website_cms", "view")
  getAnalytics(@Param("gymId") gymId: string, @Query("days") days?: string) {
    return this.service.getAnalytics(gymId, days ? parseInt(days, 10) : 30);
  }

  // ── Public (no auth — called by apps/sites) ───────────────────────────────

  @Get("sites/by-domain")
  @ApiOperation({ summary: "Fetch gym data by domain (used by apps/sites SSR)" })
  @Public()
  getByDomain(@Query("domain") domain: string) {
    return this.service.getPublicGymByDomain(domain);
  }

  @Post("sites/trial-booking")
  @ApiOperation({ summary: "Submit trial booking form — creates a Lead in the CRM" })
  @Public()
  @HttpCode(HttpStatus.OK)
  submitTrialBooking(@Body() dto: TrialBookingDto) {
    // gymSlug in body — resolve gymId server-side
    return this.service.submitTrialBookingBySlug(dto);
  }

  @Post("sites/pageview")
  @ApiOperation({ summary: "Track a page view for analytics" })
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  trackPageView(@Body("gymId") gymId: string) {
    return gymId ? this.service.trackPageView(gymId) : undefined;
  }
}
