import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import type { AppConfig } from "../../../config/configuration";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket = "invoices";

  constructor(config: ConfigService<AppConfig, true>) {
    this.supabaseUrl = config.get("supabase.url", { infer: true });
    this.serviceRoleKey = config.get("supabase.serviceRoleKey", { infer: true });
  }

  async uploadPdf(buffer: Buffer, objectPath: string): Promise<string> {
    // Dev fallback: write to /tmp and return a local path
    if (!this.supabaseUrl || this.supabaseUrl.includes("xxx")) {
      const tmpDir = path.join("/tmp", "grwfit-invoices");
      await fs.mkdir(tmpDir, { recursive: true });
      const filePath = path.join(tmpDir, path.basename(objectPath));
      await fs.writeFile(filePath, buffer);
      this.logger.debug(`Dev: saved invoice to ${filePath}`);
      return `file://${filePath}`;
    }

    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${objectPath}`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Storage upload failed: ${text}`);
      throw new Error("Failed to upload invoice PDF");
    }

    return this.getSignedUrl(objectPath);
  }

  async getSignedUrl(objectPath: string, expiresIn = 86400): Promise<string> {
    if (!this.supabaseUrl || this.supabaseUrl.includes("xxx")) {
      return `file:///tmp/grwfit-invoices/${path.basename(objectPath)}`;
    }

    const signUrl = `${this.supabaseUrl}/storage/v1/object/sign/${this.bucket}/${objectPath}`;
    const response = await fetch(signUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    });

    if (!response.ok) {
      throw new Error("Failed to get signed URL");
    }

    const data = (await response.json()) as { signedURL: string };
    return `${this.supabaseUrl}/storage/v1${data.signedURL}`;
  }
}
