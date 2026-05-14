import { Module } from "@nestjs/common";
import { WebsiteController } from "./website.controller";
import { WebsiteService } from "./website.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [WebsiteController],
  providers: [WebsiteService],
  exports: [WebsiteService],
})
export class WebsiteModule {}
