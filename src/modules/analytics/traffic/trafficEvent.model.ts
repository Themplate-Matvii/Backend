import { Schema, model, Document } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";


export enum TrafficEventEnum {
  PAGE_VIEW = "pageView",
  CLICK = "click",
  FORM_SUBMIT = "formSubmit"
}

export interface TrafficEventDocument extends Document {
  landingId?: string; // related landing ID if available
  userId?: string; // related user ID if available
  sessionId: string; // unique session identifier (cookie/uuid)
  eventType: TrafficEventEnum; // event type: pageView, click, formSubmit
  isUnique: boolean; // whether this event is first occurrence within session for given context

  url?: string; // page URL related to the event
  eventName?: string; // specific event name (e.g., button label)

  referrer?: string; // traffic source
  device?: string; // device type (desktop, mobile, tablet)
  country?: string; // country (from IP)
  language?: string; // browser language

  createdAt: Date; // timestamp of event
}

const trafficEventSchema = new Schema<TrafficEventDocument>(
  {
    landingId: { type: String },
    userId: { type: String },
    sessionId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: Object.values(TrafficEventEnum),
      required: true,
    },
    isUnique: { type: Boolean, default: false },

    url: { type: String },
    eventName: { type: String },

    referrer: { type: String },
    device: { type: String },
    country: { type: String },
    language: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

applyDefaultSchemaTransform(trafficEventSchema);

export const TrafficEventModel = model<TrafficEventDocument>(
  "TrafficEvent",
  trafficEventSchema,
  "traffic_event",
);
