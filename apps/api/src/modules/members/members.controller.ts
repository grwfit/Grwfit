import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, Req, Res,
  ParseUUIDPipe, HttpCode, HttpStatus,
  UploadedFile, UseInterceptors, ForbiddenException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiConsumes, ApiParam,
} from "@nestjs/swagger";
import type { Response } from "express";
import { MembersService } from "./members.service";
import { MembersImportService } from "./members-import.service";
import { CreateMemberQuickDto, CreateMemberFullDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { ListMembersQueryDto } from "./dto/list-members-query.dto";
import { FreezeMemberDto } from "./dto/freeze-member.dto";
import { AddNoteDto } from "./dto/add-note.dto";
import { BulkActionDto } from "./dto/bulk-action.dto";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

@ApiTags("members")
@ApiBearerAuth()
@Controller("gyms/:gymId/members")
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly importService: MembersImportService,
  ) {}

  // ── CRUD ───────────────────────────────────────────────────────────────────

  @Post()
  @RequiresPermission("members", "create")
  @ApiOperation({ summary: "Quick-add member (name + phone + optional plan)" })
  async create(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: CreateMemberFullDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const member = await this.membersService.create(gymId, dto, req);
    return { success: true, data: member };
  }

  @Get()
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "List members — paginated, filtered, sorted" })
  async list(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query() query: ListMembersQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    return this.membersService.list(gymId, query, req);
  }

  @Get("export")
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "Export members to CSV" })
  async exportCsv(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Query() query: ListMembersQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.assertGym(gymId, req);
    const csv = await this.membersService.exportCsv(gymId, query, req);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="members-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get(":memberId")
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "Get member profile" })
  async findOne(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const member = await this.membersService.findOne(gymId, memberId, req);
    return { success: true, data: member };
  }

  @Put(":memberId")
  @RequiresPermission("members", "edit")
  @ApiOperation({ summary: "Update member profile" })
  async update(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const member = await this.membersService.update(gymId, memberId, dto, req);
    return { success: true, data: member };
  }

  // ── FREEZE / UNFREEZE ──────────────────────────────────────────────────────

  @Put(":memberId/freeze")
  @RequiresPermission("members", "edit")
  @ApiOperation({ summary: "Freeze member — pauses expiry countdown" })
  async freeze(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: FreezeMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const result = await this.membersService.freeze(gymId, memberId, dto, req);
    return { success: true, data: result };
  }

  @Put(":memberId/unfreeze")
  @RequiresPermission("members", "edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unfreeze member — restores active status" })
  async unfreeze(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const result = await this.membersService.unfreeze(gymId, memberId, req);
    return { success: true, data: result };
  }

  // ── NOTES ─────────────────────────────────────────────────────────────────

  @Post(":memberId/notes")
  @RequiresPermission("members", "create")
  @ApiOperation({ summary: "Add a timestamped note to a member" })
  async addNote(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: AddNoteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const note = await this.membersService.addNote(gymId, memberId, dto, req);
    return { success: true, data: note };
  }

  @Get(":memberId/notes")
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "Get all notes for a member" })
  async getNotes(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const notes = await this.membersService.getNotes(gymId, memberId);
    return { success: true, data: notes };
  }

  // ── BULK ACTIONS ──────────────────────────────────────────────────────────

  @Post("bulk")
  @RequiresPermission("members", "edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk tag, assign trainer, send WhatsApp, or export CSV" })
  async bulkAction(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Body() dto: BulkActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const result = await this.membersService.bulkAction(gymId, dto, req);
    return { success: true, data: result };
  }

  // ── IMPORT ────────────────────────────────────────────────────────────────

  @Post("import/preview")
  @RequiresPermission("members", "create")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Preview CSV import — validate and return first 10 rows" })
  async importPreview(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    if (!file) throw new Error("No file uploaded");
    const preview = this.importService.parsePreview(file.buffer.toString("utf-8"));
    return { success: true, data: preview };
  }

  @Post("import/commit")
  @RequiresPermission("members", "create")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Commit CSV import — sync ≤100 rows, BullMQ job for >100" })
  async importCommit(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    if (!file) throw new Error("No file uploaded");
    const result = await this.importService.commitImport(gymId, file.buffer.toString("utf-8"), req);
    return { success: true, data: result };
  }

  @Get("import/:jobId/status")
  @RequiresPermission("members", "view")
  @ApiOperation({ summary: "Poll background import job status" })
  async importStatus(
    @Param("gymId", ParseUUIDPipe) gymId: string,
    @Param("jobId") jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertGym(gymId, req);
    const status = await this.importService.getJobStatus(jobId);
    return { success: true, data: status };
  }

  private assertGym(gymId: string, req: AuthenticatedRequest) {
    if (req.gymId && req.gymId !== gymId) throw new ForbiddenException("Gym mismatch");
  }
}
