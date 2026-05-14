import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../../../config/configuration";
import type { IWhatsAppBsp } from "./bsp.interface";
import { GupshupBsp } from "./gupshup.bsp";
import { WatiBsp } from "./wati.bsp";

@Injectable()
export class BspFactory {
  private instance: IWhatsAppBsp | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get(): IWhatsAppBsp {
    if (this.instance) return this.instance;

    const bsp = this.config.get("whatsapp.bsp", { infer: true });

    if (bsp === "wati") {
      this.instance = new WatiBsp({
        endpoint: this.config.get("whatsapp.watiEndpoint", { infer: true }) ?? "",
        token: this.config.get("whatsapp.watiToken", { infer: true }) ?? "",
      });
    } else {
      this.instance = new GupshupBsp({
        apiKey: this.config.get("whatsapp.gupshupApiKey", { infer: true }) ?? "",
        appName: this.config.get("whatsapp.gupshupAppName", { infer: true }) ?? "grwfit",
        srcPhone: this.config.get("whatsapp.gupshupSrcPhone", { infer: true }) ?? "",
      });
    }

    return this.instance;
  }
}
