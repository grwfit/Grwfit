export interface BspSendResult {
  success: boolean;
  bspMessageId?: string;
  error?: string;
  costPaise?: number;
}

export interface BspTemplateParams {
  phone: string;
  metaTemplateId: string;
  variables: string[];
  mediaUrl?: string;
}

export interface BspSessionParams {
  phone: string;
  text: string;
  mediaUrl?: string;
}

export interface BspWebhookPayload {
  bspMessageId: string;
  status: "delivered" | "read" | "failed";
  phone?: string;
  errorCode?: string;
  rawBody: unknown;
}

export interface IWhatsAppBsp {
  sendTemplate(params: BspTemplateParams): Promise<BspSendResult>;
  sendSession(params: BspSessionParams): Promise<BspSendResult>;
  parseWebhook(body: unknown, signature?: string): BspWebhookPayload | null;
}
