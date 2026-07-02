import { Schema, model, models } from "mongoose";

export interface IOtp {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

otpSchema.index({ email: 1, createdAt: -1 });

export const Otp = models.Otp || model<IOtp>("Otp", otpSchema);
