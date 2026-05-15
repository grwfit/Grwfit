import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AdminAuthService } from "./admin-auth.service";
import { PlatformLoginDto } from "./dto/platform-login.dto";
import { Public } from "../../common/decorators/public.decorator";

const IS_PROD = process.env["NODE_ENV"] === "production";

@ApiTags("admin-auth")
@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Platform admin login (email + password + TOTP)" })
  async login(
    @Body() dto: PlatformLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const result = await this.adminAuthService.login(dto, ip);

    res.cookie("platform_token", result.accessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8h
      path: "/",
    });

    return {
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    };
  }

  @Post("logout")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Platform admin logout" })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("platform_token", { path: "/" });
    return { success: true, data: { loggedOut: true } };
  }
}
