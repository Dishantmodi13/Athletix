import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { User, type FollowedTeam } from "../models/User.model";
import { saveAvatarFromDataUrl } from "../utils/avatarStorage";
import { serializeUser } from "../utils/userSerializer";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const MAX_FOLLOWED_TEAMS = 30;

interface UpdateProfileBody {
  username?: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  avatar?: string | null;
}

interface FollowTeamBody {
  id?: number;
  name?: string;
  logo?: string | null;
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

export async function followTeam(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const body = req.body as FollowTeamBody;
  const id = Number(body.id);
  const name = body.name?.trim();

  if (!Number.isFinite(id) || id <= 0 || !name) {
    throw new AppError("Valid team id and name are required", 400);
  }

  const alreadyFollowing = user.followedTeams.some((team: FollowedTeam) => team.id === id);
  if (alreadyFollowing) {
    res.json({
      success: true,
      message: "Already following this team",
      data: serializeUser(user),
    });
    return;
  }

  if (user.followedTeams.length >= MAX_FOLLOWED_TEAMS) {
    throw new AppError(`You can follow up to ${MAX_FOLLOWED_TEAMS} teams`, 400);
  }

  user.followedTeams.push({
    id,
    name,
    logo: body.logo?.trim() || null,
  });
  await user.save();

  res.json({
    success: true,
    message: "Team followed",
    data: serializeUser(user),
  });
}

export async function unfollowTeam(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const teamId = Number(req.params.teamId);
  if (!Number.isFinite(teamId) || teamId <= 0) {
    throw new AppError("Invalid team id", 400);
  }

  const before = user.followedTeams.length;
  user.followedTeams = user.followedTeams.filter((team: FollowedTeam) => team.id !== teamId);

  if (user.followedTeams.length === before) {
    throw new AppError("Team is not in your followed list", 404);
  }

  await user.save();

  res.json({
    success: true,
    message: "Team unfollowed",
    data: serializeUser(user),
  });
}
