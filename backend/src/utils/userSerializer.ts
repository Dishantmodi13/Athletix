import type { IUser } from "../models/User.model";

export interface SerializedUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  avatar: string | null;
}

export function serializeUser(user: IUser & { _id: { toString(): string } }): SerializedUser {
  const legacyName = (user as IUser & { name?: string }).name;

  return {
    id: user._id.toString(),
    username: user.username ?? legacyName ?? "",
    email: user.email,
    phone: user.phone ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    country: user.country ?? null,
    avatar: user.avatar ?? null,
  };
}
