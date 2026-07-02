import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { Otp } from "../models/Otp.model";
import { User } from "../models/User.model";
import {
  generateOtp,
  hashOtp,
  sendOtpEmail,
  verifyOtpHash,
} from "../services/otp.service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, env.jwtSecret, { expiresIn: "7d" });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { email: rawEmail } = req.body as { email?: string };

  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    throw new AppError("Please enter a valid email address", 400);
  }

  const email = normalizeEmail(rawEmail);

  const recentCount = await Otp.countDocuments({
    email,
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
  });

  if (recentCount >= 5) {
    throw new AppError("Too many OTP requests. Please try again later.", 429);
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

  await Otp.deleteMany({ email });
  await Otp.create({
    email,
    codeHash: hashOtp(code, email),
    expiresAt,
    attempts: 0,
  });

  const sendResult = await sendOtpEmail(email, code);

  res.json({
    success: true,
    message: sendResult.delivered
      ? "Verification code sent to your email"
      : "Gmail is not configured — use the development code shown below",
    data: {
      email,
      expiresInMinutes: env.otpExpiryMinutes,
      delivered: sendResult.delivered,
      ...(sendResult.devCode ? { devCode: sendResult.devCode } : {}),
    },
  });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { email: rawEmail, otp } = req.body as { email?: string; otp?: string };

  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    throw new AppError("Please enter a valid email address", 400);
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    throw new AppError("Please enter a valid 6-digit code", 400);
  }

  const email = normalizeEmail(rawEmail);

  const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

  if (!record) {
    throw new AppError("No verification code found. Please request a new one.", 400);
  }

  if (record.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: record._id });
    throw new AppError("Verification code has expired. Please request a new one.", 400);
  }

  if (record.attempts >= 5) {
    throw new AppError("Too many failed attempts. Please request a new code.", 429);
  }

  const isValid = verifyOtpHash(otp, email, record.codeHash);

  if (!isValid) {
    record.attempts += 1;
    await record.save();
    throw new AppError("Invalid verification code. Please try again.", 401);
  }

  await Otp.deleteMany({ email });

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      name: displayNameFromEmail(email),
    });
  }

  const token = signToken(user._id.toString(), user.email);

  res.json({
    success: true,
    message: "Signed in successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      token,
    },
  });
}
