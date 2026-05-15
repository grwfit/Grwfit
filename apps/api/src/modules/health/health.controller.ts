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
  async check() {
    const prisma = getPrismaClient();

    // Run ping and surface the real error if it fails
    try {
      return await this.health.check([
        () => this.prismaHealth.pingCheck("database", prisma),
      ]);
    } catch (err: unknown) {
      const cause = (err as { causes?: unknown })?.causes;
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: "error",
        database: { status: "down", error: message, cause },
        env: {
          DATABASE_URL_SET: !!process.env["DATABASE_URL"],
          DATABASE_URL_PREFIX: process.env["DATABASE_URL"]?.substring(0, 30) ?? "NOT SET",
        },
      };
    }
  }
}
