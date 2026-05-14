import { Module } from "@nestjs/common";
import { MemberPortalController } from "./member-portal.controller";
import { PlansModule } from "../plans/plans.module";
import { ClassesModule } from "../classes/classes.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, PlansModule, ClassesModule],
  controllers: [MemberPortalController],
})
export class MemberPortalModule {}
