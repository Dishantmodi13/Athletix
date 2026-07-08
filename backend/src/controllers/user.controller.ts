import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { User } from "../models/User.model";
import { saveAvatarFromDataUrl } from "../utils/avatarStorage";
import { serializeUser } from "../utils/userSerializer";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

interface UpdateProfileBody {
  username?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  avatar?: string | null;
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({
    success: true,
    data: serializeUser(user),
  });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const body = req.body as UpdateProfileBody;
  const updates: UpdateProfileBody & { username?: string } = {};

  if (body.username !== undefined) {
    const username = body.username.trim();
    if (!USERNAME_REGEX.test(username)) {
      throw new AppError("Username must be 3–30 characters (letters, numbers, underscore only)", 400);
    }

    const taken = await User.findOne({ username, _id: { $ne: user._id } });
    if (taken) {
      throw new AppError("Username is already taken", 409);
    }

    updates.username = username;
  }

  if (body.phone !== undefined) {
    const phone = body.phone?.trim() ?? "";
    if (phone && !PHONE_REGEX.test(phone)) {
      throw new AppError("Please enter a valid mobile number", 400);
    }
    updates.phone = phone || null;
  }

  if (body.city !== undefined) {
    updates.city = body.city?.trim() || null;
  }

  if (body.state !== undefined) {
    updates.state = body.state?.trim() || null;
  }

  if (body.country !== undefined) {
    updates.country = body.country?.trim() || null;
  }

  if (body.avatar !== undefined) {
    if (!body.avatar) {
      updates.avatar = null;
    } else if (body.avatar.startsWith("data:image/")) {
      updates.avatar = await saveAvatarFromDataUrl(user._id.toString(), body.avatar);
    } else if (body.avatar.startsWith("/uploads/") || body.avatar.startsWith("http")) {
      updates.avatar = body.avatar;
    } else {
      throw new AppError("Invalid avatar value", 400);
    }
  }

  Object.assign(user, updates);
  await user.save();

  res.json({
    success: true,
    message: "Profile updated",
    data: serializeUser(user),
  });
}
