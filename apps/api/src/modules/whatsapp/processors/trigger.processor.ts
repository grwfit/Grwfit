import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import type { Job } from "bull";
import { WhatsAppModuleService, TRIGGER_QUEUE } from "../whatsapp.service";

interface TriggerJob {
  gymId: string;
  memberId: string;
  phone: string;
  templateId: string;
  metaTemplateId: string;
  variables: string[];
  event: string;
}

@Processor(TRIGGER_QUEUE)
export class TriggerProcessor {
  private readonly logger = new Logger(TriggerProcessor.name);

  constructor(private readonly whatsappService: WhatsAppModuleService) {}

  @Process("send")
  async handleTrigger(job: Job<TriggerJob>) {
    const { gymId, memberId, phone, templateId, metaTemplateId, variables, event } = job.data;

    try {
      await this.whatsappService.sendAndLog({
        gymId,
        memberId,
        templateId,
        metaTemplateId,
        phone,
        variables,
        event,
      });
    } catch (err) {
      this.logger.error(`Trigger ${event} failed for ${phone}: ${err}`);
      throw err;
    }
  }
}
