import { Schema, model, Document } from "mongoose";
import { PaymentStatus, BonusSourceType, PaymentMode } from "@modules/billing/types";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface PaymentDocument extends Document {
  userId: Schema.Types.ObjectId;
  planKey?: string;
  productKey?: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  sourceType?: PaymentMode;

  // Links and IDs for invoices/receipts
  invoiceId?: string;
  invoiceUrl?: string;
  invoicePdfUrl?: string;
  receiptUrl?: string;
  checkoutSessionId?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planKey: {
      type: String,
      required: false,
    },
    productKey: {
      type: String,
      required: false,
    },
    provider: {
      type: String,
      required: true,
    },
    providerPaymentId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
    },
    sourceType: {
      type: String,
      enum: Object.values(PaymentMode),
      required: false,
    },

    // Optional invoice and receipt links
    invoiceId: {
      type: String,
      required: false,
    },
    invoiceUrl: {
      type: String,
      required: false,
    },
    invoicePdfUrl: {
      type: String,
      required: false,
    },
    receiptUrl: {
      type: String,
      required: false,
    },
    checkoutSessionId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

applyDefaultSchemaTransform(PaymentSchema);

export const PaymentModel = model<PaymentDocument>("Payment", PaymentSchema);
