import { Schema, model, type Types } from "mongoose";

export interface WebhookEventDoc {
  _id: Types.ObjectId;
  eventId: string;
  type: string;
  receivedAt: Date;
  processedAt: Date | null;
}

const webhookEventSchema = new Schema<WebhookEventDoc>({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  receivedAt: { type: Date, default: () => new Date() },
  processedAt: { type: Date, default: null },
});

webhookEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const WebhookEvent = model<WebhookEventDoc>("WebhookEvent", webhookEventSchema, "webhook_events");
