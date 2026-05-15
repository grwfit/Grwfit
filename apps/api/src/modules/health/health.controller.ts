import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { getPrismaClient } from "@grwfit/db";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: "Health check" })
  async check() {
    const prisma = getPrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", info: { database: { status: "up" } } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as Record<string, unknown>)["code"];
      const meta  = (err as Record<string, unknown>)["meta"];
      return {
        status: "error",
        database: { status: "down", error: message, code, meta },
        env: {
          DATABASE_URL_SET: !!process.env["DATABASE_URL"],
          DATABASE_URL_PREFIX: process.env["DATABASE_URL"]?.substring(0, 50) ?? "NOT SET",
          DIRECT_URL_SET: !!process.env["DIRECT_URL"],
        },
      };
    }
  }
}
