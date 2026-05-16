import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, Query,
  UseGuards, Req, HttpCode, HttpStatus, RawBodyRequest,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { WhatsAppModuleService } from "./whatsapp.service";
import { BroadcastService } from "./services/broadcast.service";
import {
  CreateTemplateDto, UpdateTemplateDto, TestTemplateSendDto,
  CreateBroadcastDto, UpsertTriggerRuleDto, ListMessagesQueryDto,
  BroadcastAudienceQueryDto,
} from "./dto/whatsapp.dto";
import type { TriggerEvent } from "@grwfit/db";

@ApiTags("WhatsApp")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("whatsapp")
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppModuleService,
    private readonly broadcastService: BroadcastService,
  ) {}

  // ── Templates ─────────────────────────────────────────────────────────────

  @Get("templates")
  @ApiOperation({ summary: "List WhatsApp templates for the gym" })
  @RequiresPermission("website_cms", "view")
  listTemplates(@Req() req: AuthenticatedRequest) {
    return this.whatsappService.listTemplates(req.gymId!);
  }

  @Post("templates")
  @ApiOperation({ summary: "Create a new WhatsApp template" })
  @RequiresPermission("website_cms", "create")
  createTemplate(@Req() req: AuthenticatedRequest, @Body() dto: CreateTemplateDto) {
    return this.whatsappService.createTemplate(req.gymId!, dto);
  }

  @Put("templates/:id")
  @ApiOperation({ summary: "Update a WhatsApp template (resets approval status)" })
  @RequiresPermission("website_cms", "edit")
  updateTemplate(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.whatsappService.updateTemplate(req.gymId!, id, dto);
  }

  @Delete("templates/:id")
  @ApiOperation({ summary: "Delete a WhatsApp template" })
  @RequiresPermission("website_cms", "delete")
  deleteTemplate(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.whatsappService.deleteTemplate(req.gymId!, id);
  }

  @Post("templates/:id/test-send")
  @ApiOperation({ summary: "Send a test message to owner's phone" })
  @RequiresPermission("website_cms", "edit")
  testSend(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: TestTemplateSendDto,
  ) {
    return this.whatsappService.testSend(req.gymId!, id, dto);
  }

  // ── Broadcasts ────────────────────────────────────────────────────────────

  @Get("broadcasts")
  @ApiOperation({ summary: "List broadcast campaigns" })
  @RequiresPermission("members", "view")
  listBroadcasts(@Req() req: AuthenticatedRequest) {
    return this.broadcastService.listCampaigns(req.gymId!);
  }

  @Get("broadcasts/:id")
  @ApiOperation({ summary: "Get broadcast campaign detail" })
  @RequiresPermission("members", "view")
  getBroadcast(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.broadcastService.getCampaign(req.gymId!, id);
  }

  @Post("broadcasts")
  @ApiOperation({ summary: "Create a broadcast campaign" })
  @RequiresPermission("members", "create")
  createBroadcast(@Req() req: AuthenticatedRequest, @Body() dto: CreateBroadcastDto) {
    return this.broadcastService.createCampaign(req.gymId!, req.userId!, dto);
  }

  @Post("broadcasts/:id/send")
  @ApiOperation({ summary: "Send/queue a broadcast campaign immediately" })
  @RequiresPermission("members", "create")
  @HttpCode(HttpStatus.ACCEPTED)
  sendBroadcast(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.broadcastService.sendCampaign(req.gymId!, id);
  }

  @Post("broadcasts/:id/cancel")
  @ApiOperation({ summary: "Cancel a scheduled or running campaign" })
  @RequiresPermission("members", "edit")
  cancelBroadcast(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.broadcastService.cancelCampaign(req.gymId!, id);
  }

  @Post("broadcasts/audience-count")
  @ApiOperation({ summary: "Preview how many members match the audience filter" })
  @RequiresPermission("members", "view")
  audienceCount(@Req() req: AuthenticatedRequest, @Body() filter: BroadcastAudienceQueryDto) {
    return this.broadcastService.previewAudienceCount(req.gymId!, filter as Record<string, unknown>);
  }

  // ── Trigger Rules ─────────────────────────────────────────────────────────

  @Get("trigger-rules")
  @ApiOperation({ summary: "List all trigger rules for the gym" })
  @RequiresPermission("website_cms", "view")
  listTriggerRules(@Req() req: AuthenticatedRequest) {
    return this.whatsappService.listTriggerRules(req.gymId!);
  }

  @Put("trigger-rules/:event")
  @ApiOperation({ summary: "Upsert a trigger rule for a specific event" })
  @RequiresPermission("website_cms", "edit")
  upsertTriggerRule(
    @Req() req: AuthenticatedRequest,
    @Param("event") event: string,
    @Body() dto: UpsertTriggerRuleDto,
  ) {
    return this.whatsappService.upsertTriggerRule(req.gymId!, event as TriggerEvent, dto);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  @Get("messages")
  @ApiOperation({ summary: "List WhatsApp messages with filters" })
  @RequiresPermission("members", "view")
  listMessages(@Req() req: AuthenticatedRequest, @Query() query: ListMessagesQueryDto) {
    return this.whatsappService.listMessages(req.gymId!, query);
  }

  // ── Cost Stats ────────────────────────────────────────────────────────────

  @Get("stats/cost")
  @ApiOperation({ summary: "Get WhatsApp cost stats for a month (YYYY-MM)" })
  @RequiresPermission("billing", "view")
  getCostStats(@Req() req: AuthenticatedRequest, @Query("month") month: string) {
    const m = month ?? new Date().toISOString().substring(0, 7);
    return this.whatsappService.getCostStats(req.gymId!, m);
  }

  // ── Opt-out (internal / member-triggered) ────────────────────────────────

  @Post("optout")
  @ApiOperation({ summary: "Record opt-out for a phone number (called by STOP webhook)" })
  @HttpCode(HttpStatus.OK)
  handleOptout(@Req() req: AuthenticatedRequest, @Body("phone") phone: string) {
    return this.whatsappService.handleOptout(req.gymId!, phone);
  }

  // ── BSP Delivery Webhook (no auth — verified by signature) ────────────────

  @Post("webhook/delivery")
  @ApiOperation({ summary: "BSP delivery status webhook" })
  @HttpCode(HttpStatus.OK)
  async deliveryWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers["x-gupshup-signature"] as string | undefined
      ?? req.headers["x-wati-signature"] as string | undefined;
    await this.whatsappService.handleDeliveryWebhook(req.body, sig);
    return { received: true };
  }
}
