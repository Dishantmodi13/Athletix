import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { warmFeaturedLeagueCaches } from "./services/leagueDataCache";
import { footballService } from "./services/football.service";
import { warmCricketLeagueDiscovery } from "./providers/cricket/espnCricket.provider";
import { isEmailConfigured, getEmailSetupHint } from "./services/otp.service";

async function startServer(): Promise<void> {
  await connectDB();

  if (!isEmailConfigured()) {
    console.warn(
      "[Athletix] Email not configured — OTP emails will NOT be sent.\n" +
        "  Option A (Gmail): set GMAIL_USER + GMAIL_APP_PASSWORD in .env\n" +
        "    App Password: https://myaccount.google.com/apppasswords\n" +
        "  Option B (Resend): set RESEND_API_KEY in .env (free at https://resend.com)"
    );
  } else {
    console.log(`[Athletix] OTP email provider: ${getEmailSetupHint()}`);
  }

  app.listen(env.port, () => {
    console.log(`Athletix API running on http://localhost:${env.port}`);
    setTimeout(() => {
      void warmFeaturedLeagueCaches();
      void footballService.getHomeDashboard().catch(() => undefined);
      warmCricketLeagueDiscovery();
    }, 15_000);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
