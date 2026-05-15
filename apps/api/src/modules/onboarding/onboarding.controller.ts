import {
  Controller, Get, Post, Body, Param, UseGuards, Req, HttpCode, HttpStatus, Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedRequest } from "../../common/middleware/tenant.middleware";
import { OnboardingService } from "./onboarding.service";
import type {
  GymSignupDto, Step1GymProfileDto, Step2PlansDto,
  Step3StaffDto, ConvertTrialDto,
} from "./dto/onboarding.dto";

const IS_PROD = process.env["NODE_ENV"] === "production";

@ApiTags("Onboarding")
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post("signup")
  @Public()
  @ApiOperation({ summary: "Public gym signup — creates gym + owner + issues JWT" })
  async signup(
    @Body() dto: GymSignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.signupGym(dto);
    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    return {
      gymId: result.gym.id,
      gymName: result.gym.name,
      gymSlug: result.gym.slug,
      trialEndsAt: result.trialEndsAt,
    };
  }

  @Get("progress")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get wizard progress for the current gym" })
  getProgress(@Req() req: AuthenticatedRequest) {
    return this.service.getProgress(req.gymId!);
  }

  @Post("step/1")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Save wizard step 1 — gym profile" })
  step1(@Req() req: AuthenticatedRequest, @Body() dto: Step1GymProfileDto) {
    return this.service.completeStep1(req.gymId!, dto);
  }

  @Post("step/2")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Save wizard step 2 — membership plans" })
  step2(@Req() req: AuthenticatedRequest, @Body() dto: Step2PlansDto) {
    return this.service.completeStep2(req.gymId!, dto);
  }

  @Post("step/3")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Save wizard step 3 — add trainers" })
  step3(@Req() req: AuthenticatedRequest, @Body() dto: Step3StaffDto) {
    return this.service.completeStep3(req.gymId!, dto);
  }

  @Post("step/4/skip")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Skip wizard step 4 (member import)" })
  @HttpCode(HttpStatus.OK)
  skipStep4(@Req() req: AuthenticatedRequest) {
    return this.service.skipStep4(req.gymId!);
  }

  @Post("step/5")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Complete wizard step 5 — first check-in" })
  step5(@Req() req: AuthenticatedRequest) {
    return this.service.completeStep5(req.gymId!);
  }

  @Post("convert")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Convert trial to paid plan" })
  convertTrial(@Req() req: AuthenticatedRequest, @Body() dto: ConvertTrialDto) {
    return this.service.convertTrial(req.gymId!, dto);
  }
}
