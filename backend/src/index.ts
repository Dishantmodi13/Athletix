import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { isEmailConfigured } from "./services/otp.service";

async function startServer(): Promise<void> {
  await connectDB();

  if (!isEmailConfigured()) {
    console.warn(
      "[Athletix] Gmail not configured — OTP emails will NOT be sent.\n" +
        "  Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env file.\n" +
        "  Create an App Password: https://myaccount.google.com/apppasswords\n" +
        "  In development, OTP codes are shown on the login screen instead."
    );
  }

  app.listen(env.port, () => {
    console.log(`Athletix API running on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
