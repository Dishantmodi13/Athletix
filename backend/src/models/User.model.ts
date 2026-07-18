import { Schema, model, models } from "mongoose";

export interface FollowedTeam {
  id: number;
  name: string;
  logo?: string | null;
}

export interface IUser {
  username: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  avatar?: string | null;
  followedTeams: FollowedTeam[];
  createdAt: Date;
  updatedAt: Date;
}

const followedTeamSchema = new Schema<FollowedTeam>(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: null },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    avatar: { type: String, default: null },
    followedTeams: { type: [followedTeamSchema], default: [] },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

userSchema.pre("validate", function migrateLegacyName() {
  const doc = this as IUser & { name?: string };
  if (!doc.username && doc.name) {
    doc.username = doc.name;
  }
});

export const User = models.User || model<IUser>("User", userSchema);
