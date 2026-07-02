import dotenv from "dotenv";
import path from "path";

const rootEnv = path.resolve(process.cwd(), "../.env");
const localEnv = path.resolve(process.cwd(), ".env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: requireEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/athletix"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production",
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES ?? 10),
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  /** API-Football (api-sports.io) — supports comma-separated keys for rotation. */
  footballApiKeys: process.env.FOOTBALL_API_KEYS ?? process.env.FOOTBALL_API_KEY ?? "",
  /** @deprecated Use FOOTBALL_API_KEYS — kept for backward compatibility. */
  footballApiKey: process.env.FOOTBALL_API_KEY ?? "",
  footballApiBaseUrl:
    process.env.FOOTBALL_API_BASE_URL ?? "https://v3.football.api-sports.io",
  /** football-data.org — supports comma-separated keys for rotation. */
  footballDataApiKeys: process.env.FOOTBALL_DATA_API_KEYS ?? "",
  /** Default season for league stats (e.g. 2025 for the 2025/26 season). */
  footballDefaultSeason: Number(process.env.FOOTBALL_DEFAULT_SEASON ?? 2025),
};
