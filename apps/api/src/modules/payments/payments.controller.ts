import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, Req, Res, HttpCode, HttpStatus, ParseUUIDPipe, Headers,
} from "@nestjs/common";
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiExcludeEndpoint,
} from "@nestjs/swagger";
import type { Response } from "express";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { RefundDto } from "./dto/refund.dto";
import { ListPaymentsQueryDto, CreateCashReconciliationDto, CreatePlanDto } from "./dto/list-payments-query.dto";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@ApiTags("payments")
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── PLANS ─────────────────────────────────────────────────────────────────

  @Get("gyms/:gymId/plans")
  @RequiresPermission("payments", "view")
  @ApiOperation({ summary: "List active membership plans" })
  async listPlans(@Param("gymId", ParseUUIDPipe) gymId: string, @Req() req: AuthenticatedRequest) {
    this.assertGym(gymId, req);
    const plans = await this.paymentsService.listPlans(gymId);
    return { success: true, data: plans };
  }

  @Post("gyms/:gymId/plans")
  @RequiresPermission("payments", "create")
  @ApiOperation({ summary: "Create a membership plan" })
  async createPlan(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: CreatePlanDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const plan = await this.paymentsService.createPlan(gymId, dto, req);
    return { success: true, data: plan };
  }

  @Put("gyms/:gymId/plans/:planId")
  @RequiresPermission("payments", "edit")
  @ApiOperation({ summary: "Update a membership plan" })
  async updatePlan(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("planId", ParseUUIDPipe) planId: string,
    @Body() dto: Partial<CreatePlanDto>,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const plan = await this.paymentsService.updatePlan(gymId, planId, dto, req);
    return { success: true, data: plan };
  }

  @Delete("gyms/:gymId/plans/:planId")
  @RequiresPermission("payments", "delete")
  @HttpCode(HttpStatus.OK)
  async deletePlan(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("planId", ParseUUIDPipe) planId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    return { success: true, data: await this.paymentsService.deletePlan(gymId, planId) };
  }

  // ── PAYMENTS ─────────────────────────────────────────────────────────────

  @Post("gyms/:gymId/payments")
  @RequiresPermission("payments", "create")
  @ApiOperation({ summary: "Record a payment — generates GST invoice and WhatsApps it" })
  async create(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const payment = await this.paymentsService.create(gymId, dto, req);
    return { success: true, data: payment };
  }

  @Get("gyms/:gymId/payments")
  @RequiresPermission("payments", "view")
  @ApiOperation({ summary: "List payments — paginated and filtered" })
  async list(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query() query: ListPaymentsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    return this.paymentsService.list(gymId, query, req);
  }

  @Get("gyms/:gymId/payments/gst-report")
  @RequiresPermission("reports", "view")
  @ApiQuery({ name: "from", required: true })
  @ApiQuery({ name: "to", required: true })
  @ApiOperation({ summary: "GST report — summary + detail for a date range" })
  async gstReport(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.paymentsService.gstReport(gymId, from, to);
    return { success: true, data };
  }

  @Get("gyms/:gymId/payments/gst-report/export")
  @RequiresPermission("reports", "view")
  @ApiOperation({ summary: "Export GST report as CSV for CA" })
  async exportGstReport(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.assertGym(gymId, req);
    const csv = await this.paymentsService.exportGstCsv(gymId, from, to);
    const filename = `gst-report-${from}-to-${to}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get("gyms/:gymId/payments/:paymentId")
  @RequiresPermission("payments", "view")
  @ApiOperation({ summary: "Get payment detail" })
  async findOne(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const payment = await this.paymentsService.findOne(gymId, paymentId);
    return { success: true, data: payment };
  }

  @Post("gyms/:gymId/payments/:paymentId/refund")
  @RequiresPermission("payments", "edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refund a payment (owner/manager only)" })
  async refund(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @Body() dto: RefundDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const refund = await this.paymentsService.refund(gymId, paymentId, dto, req);
    return { success: true, data: refund };
  }

  // ── CASH RECONCILIATION ───────────────────────────────────────────────────

  @Post("gyms/:gymId/payments/cash-reconciliation")
  @RequiresPermission("payments", "create")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit daily cash close-of-day reconciliation" })
  async createReconciliation(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: CreateCashReconciliationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const rec = await this.paymentsService.createReconciliation(gymId, dto, req);
    return { success: true, data: rec };
  }

  @Get("gyms/:gymId/payments/cash-reconciliation")
  @RequiresPermission("payments", "view")
  @ApiOperation({ summary: "List cash reconciliation records" })
  async listReconciliations(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.paymentsService.listReconciliations(gymId);
    return { success: true, data };
  }

  @Put("gyms/:gymId/payments/cash-reconciliation/:reconId/approve")
  @RequiresPermission("payments", "edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Approve cash reconciliation (owner/manager only)" })
  async approveReconciliation(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("reconId", ParseUUIDPipe) reconId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const data = await this.paymentsService.approveReconciliation(gymId, reconId, req);
    return { success: true, data };
  }

  // ── RAZORPAY WEBHOOK ──────────────────────────────────────────────────────

  @Post("payments/razorpay/webhook")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async razorpayWebhook(
    @Body() body: unknown,
    @Headers("x-razorpay-signature") signature: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Raw body is stored on req by the rawBodyMiddleware
    const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(body);
    const event = (body as { event?: string }).event ?? "";
    const result = await this.paymentsService.handleWebhook(rawBody, signature, event, body);
    return result;
  }

  private assertGym(gymId: string, req: AuthenticatedRequest) {
    if (req.gymId && req.gymId !== gymId) throw new Error("Forbidden: gym mismatch");
  }
}
