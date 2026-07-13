import crypto from "crypto";
import nodemailer from "nodemailer";
import { Resend } from "resend";
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

type EmailProvider = "gmail" | "resend" | "smtp";

function resolveEmailProvider(): EmailProvider | null {
  if (env.resendApiKey) return "resend";
  if (env.gmailUser && env.gmailAppPassword) return "gmail";
  if (env.smtpHost && env.smtpUser && env.smtpPass) return "smtp";
  return null;
}

export function isEmailConfigured(): boolean {
  return resolveEmailProvider() !== null;
}

function otpEmailContent(code: string) {
  return {
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
  };
}

async function sendViaGmail(email: string, code: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: env.gmailUser,
      pass: env.gmailAppPassword.replace(/\s/g, ""),
    },
  });

  const content = otpEmailContent(code);

  await transporter.verify();
  await transporter.sendMail({
    from: `"Athletix" <${env.gmailUser}>`,
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

async function sendViaResend(email: string, code: string): Promise<void> {
  const resend = new Resend(env.resendApiKey);
  const from = env.resendFrom || "Athletix <onboarding@resend.dev>";
  const content = otpEmailContent(code);

  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  if (error) {
    throw new AppError(error.message || "Failed to send verification email", 503);
  }
}

async function sendViaSmtp(email: string, code: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  const from = env.smtpFrom || env.smtpUser;
  const content = otpEmailContent(code);

  await transporter.verify();
  await transporter.sendMail({
    from: `"Athletix" <${from}>`,
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

export interface OtpSendResult {
  delivered: boolean;
}

export async function sendOtpEmail(email: string, code: string): Promise<OtpSendResult> {
  const provider = resolveEmailProvider();

  if (!provider) {
    console.warn(
      `[Athletix OTP] No email provider configured — cannot send code to ${email}.`
    );
    throw new AppError(
      "Email delivery is not configured. Add Gmail or Resend credentials to your .env file and restart the server.",
      503
    );
  }

  try {
    if (provider === "resend") {
      await sendViaResend(email, code);
    } else if (provider === "gmail") {
      await sendViaGmail(email, code);
    } else {
      await sendViaSmtp(email, code);
    }

    console.log(`[Athletix OTP] Sent to ${email} via ${provider}`);
    return { delivered: true };
  } catch (error) {
    if (error instanceof AppError) throw error;

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Athletix OTP] Send failed (${provider}):`, message);

    if (message.includes("Invalid login") || message.includes("EAUTH") || message.includes("535")) {
      throw new AppError(
        "Email authentication failed. For Gmail, use an App Password (not your regular password): https://myaccount.google.com/apppasswords",
        503
      );
    }

    if (message.includes("ECONNECTION") || message.includes("ETIMEDOUT")) {
      throw new AppError("Could not connect to the email server. Check your internet connection and try again.", 503);
    }

    throw new AppError("Failed to send verification email. Please try again later.", 503);
  }
}

export function getEmailSetupHint(): string {
  const provider = resolveEmailProvider();
  if (provider === "resend") return "Resend API";
  if (provider === "gmail") return `Gmail (${env.gmailUser})`;
  if (provider === "smtp") return `SMTP (${env.smtpHost})`;
  return "none — set GMAIL_USER + GMAIL_APP_PASSWORD, or RESEND_API_KEY, in .env";
}
