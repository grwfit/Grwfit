import { Module } from "@nestjs/common";
import { TrainersController } from "./trainers.controller";
import { TrainersService } from "./trainers.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [TrainersController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}
