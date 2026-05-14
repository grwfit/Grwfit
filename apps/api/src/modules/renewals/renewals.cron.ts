import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RenewalsService } from "./renewals.service";
import { RedisService } from "../../common/services/redis.service";

@Injectable()
export class RenewalsCron {
  private readonly logger = new Logger(RenewalsCron.name);

  constructor(
    private readonly renewalsService: RenewalsService,
    private readonly redis: RedisService,
  ) {}

  /** Run every hour. Uses Redis lock to prevent duplicate execution on multi-instance deploys. */
  @Cron(CronExpression.EVERY_HOUR)
  async runReminderEngine() {
    const lockKey = "renewal_engine_lock";
    const acquired = await this.redis.setNx(lockKey, "1", 3540); // 59-min lock
    if (!acquired) {
      this.logger.debug("Renewal engine already running on another instance — skipping");
      return;
    }

    try {
      this.logger.log("Starting renewal reminder engine...");
      const result = await this.renewalsService.runReminderEngine();
      this.logger.log(`Renewal engine complete: ${result.queued} reminders queued`);
    } catch (err) {
      this.logger.error("Renewal engine error", err);
    }
  }
}
