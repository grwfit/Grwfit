import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";
import { Public } from "../../common/decorators/public.decorator";
import { getPrismaClient } from "@grwfit/db";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: "Health check" })
  check() {
    const prisma = getPrismaClient();
    return this.health.check([
      () => this.prismaHealth.pingCheck("database", prisma),
    ]);
  }
}
