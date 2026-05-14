import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "./common/decorators/public.decorator";

@ApiTags("app")
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: "API root" })
  root() {
    return {
      name: "GrwFit API",
      version: "v1",
      docs: "/api/v1/docs",
      health: "/api/v1/health",
    };
  }
}
