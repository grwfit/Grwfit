import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MembersService } from "./members.service";

@Injectable()
export class MembersCron {
  private readonly logger = new Logger(MembersCron.name);

  constructor(private readonly membersService: MembersService) {}

  /** Run every hour: unfreeze members whose freeze period has expired */
  @Cron(CronExpression.EVERY_HOUR)
  async autoUnfreeze() {
    this.logger.debug("Running auto-unfreeze cron");
    const count = await this.membersService.processAutoUnfreezes();
    if (count > 0) {
      this.logger.log(`Auto-unfroze ${count} member(s)`);
    }
  }
}
