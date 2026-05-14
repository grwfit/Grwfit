import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { SelectGymDto } from "./dto/select-gym.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";

const IS_PROD = process.env["NODE_ENV"] === "production";

const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/request")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request OTP — sent via WhatsApp, SMS fallback" })
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @Req() req: Request,
  ) {
    const result = await this.authService.requestOtp(dto, req.ip);
    return {
      success: true,
      data: {
        sent: result.sent,
        channel: result.channel,
        // Expose OTP in development so you can test without WhatsApp credentials
        ...(IS_PROD ? {} : { devOtp: result.devOtp }),
      },
    };
  }

  @Post("otp/verify")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify OTP and receive tokens via httpOnly cookies" })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const auth = await this.authService.verifyOtp(
      dto,
      req.ip,
      req.headers["user-agent"],
    );

    // Set httpOnly cookies — never localStorage
    res.cookie("access_token", auth.accessToken, {
      ...COOKIE_BASE,
      maxAge: 15 * 60 * 1000, // 15 min
      path: "/",
    });

    if (auth.refreshToken) {
      res.cookie("refresh_token", auth.refreshToken, {
        ...COOKIE_BASE,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/api/v1/auth",
      });
    }

    return {
      success: true,
      data: {
        user: auth.user,
        gymId: auth.gymId,
        gyms: auth.gyms,
        // Only expose accessToken here if no gyms to select (already scoped)
        // When multi-gym, accessToken is the pre-select token
        ...(auth.gyms?.length ? { preSelectToken: auth.accessToken } : {}),
      },
    };
  }

  @Post("select-gym")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Select gym for multi-gym staff; issues gym-scoped JWT" })
  async selectGym(
    @Body() dto: SelectGymDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Expect pre-select token in Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Pre-select token required");
    }
    const preSelectToken = authHeader.slice(7);

    const auth = await this.authService.selectGym(
      preSelectToken,
      dto,
      req.ip,
      req.headers["user-agent"],
    );

    res.cookie("access_token", auth.accessToken, {
      ...COOKIE_BASE,
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    res.cookie("refresh_token", auth.refreshToken, {
      ...COOKIE_BASE,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/api/v1/auth",
    });

    return {
      success: true,
      data: { user: auth.user, gymId: auth.gymId },
    };
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate refresh token — reads from cookie or body" })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken =
      dto.refreshToken ?? (req.cookies as Record<string, string>)?.["refresh_token"];

    if (!rawRefreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }

    const tokens = await this.authService.refresh(rawRefreshToken);

    res.cookie("access_token", tokens.accessToken, {
      ...COOKIE_BASE,
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    res.cookie("refresh_token", tokens.refreshToken, {
      ...COOKIE_BASE,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/api/v1/auth",
    });

    return { success: true, data: { refreshed: true } };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke refresh token and clear cookies" })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser("userId") userId: string,
  ) {
    const rawRefreshToken = (req.cookies as Record<string, string>)?.["refresh_token"];
    await this.authService.logout(rawRefreshToken, userId);

    // Clear cookies
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });

    return { success: true, data: { loggedOut: true } };
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  async getMe(@Req() req: AuthenticatedRequest) {
    if (!req.userId || !req.userType) {
      throw new UnauthorizedException("Not authenticated");
    }
    const user = await this.authService.getMe(
      req.userId,
      req.userType as "staff" | "member",
      req.gymId,
    );
    return { success: true, data: user };
  }
}
