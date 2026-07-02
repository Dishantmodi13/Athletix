import { Schema, model, models } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    avatar: { type: String },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", userSchema);
