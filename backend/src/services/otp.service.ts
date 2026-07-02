import crypto from "crypto";
import nodemailer from "nodemailer";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

function hashOtp(code: string, email: string): string {
  return crypto
    .createHmac("sha256", env.jwtSecret)
    .update(`${email}:${code}`)
    .digest("hex");
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function verifyOtpHash(code: string, email: string, hash: string): boolean {
  const expected = hashOtp(code, email);
  if (expected.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

export { hashOtp };

export function isEmailConfigured(): boolean {
  return Boolean(env.gmailUser && env.gmailAppPassword);
}

function createTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: env.gmailUser,
      pass: env.gmailAppPassword.replace(/\s/g, ""),
    },
  });
}

export interface OtpSendResult {
  delivered: boolean;
  devCode?: string;
}

export async function sendOtpEmail(email: string, code: string): Promise<OtpSendResult> {
  const transporter = createTransporter();

  if (!transporter) {
    if (env.nodeEnv === "development") {
      console.log(
        `[Athletix OTP] ${email} → ${code} (Gmail not configured — add GMAIL_USER & GMAIL_APP_PASSWORD to .env)`
      );
      return { delivered: false, devCode: code };
    }
    throw new AppError(
      "Email delivery is not configured on the server. Contact support.",
      503
    );
  }

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `"Athletix" <${env.gmailUser}>`,
      to: email,
      subject: "Your Athletix sign-in code",
      text: `Your Athletix verification code is: ${code}\n\nThis code expires in ${env.otpExpiryMinutes} minutes. Do not share it with anyone.`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #050505; color: #fff; border-radius: 16px;">
          <h1 style="color: #3B82F6; margin-bottom: 8px;">Athletix</h1>
          <p style="color: #9CA3AF; margin-bottom: 24px;">Your sign-in verification code</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #fff; background: #111; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            ${code}
          </div>
          <p style="color: #9CA3AF; font-size: 14px; margin-top: 24px;">
            This code expires in ${env.otpExpiryMinutes} minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log(`[Athletix OTP] Sent to ${email}`);
    return { delivered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Athletix OTP] Send failed:", message);

    if (message.includes("Invalid login") || message.includes("EAUTH") || message.includes("535")) {
      throw new AppError(
        "Gmail authentication failed. Use a Gmail App Password (not your regular password). See: https://myaccount.google.com/apppasswords",
        503
      );
    }

    if (message.includes("ECONNECTION") || message.includes("ETIMEDOUT")) {
      throw new AppError("Could not connect to Gmail. Check your internet connection and try again.", 503);
    }

    throw new AppError("Failed to send verification email. Please try again later.", 503);
  }
}
