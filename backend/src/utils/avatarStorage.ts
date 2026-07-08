import fs from "fs/promises";
import path from "path";
import { AppError } from "../middleware/errorHandler";

const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatars");
const MAX_BYTES = 2 * 1024 * 1024;

export async function saveAvatarFromDataUrl(userId: string, dataUrl: string): Promise<string> {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new AppError("Invalid image format. Use JPEG, PNG, or WebP.", 400);
  }

  const mime = match[1]!.toLowerCase();
  const base64 = match[2]!;
  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength > MAX_BYTES) {
    throw new AppError("Image too large. Maximum size is 2 MB.", 400);
  }

  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  await fs.mkdir(AVATAR_DIR, { recursive: true });

  const filename = `${userId}.${ext}`;
  const filePath = path.join(AVATAR_DIR, filename);

  await fs.writeFile(filePath, buffer);

  for (const oldExt of ["jpg", "jpeg", "png", "webp"]) {
    if (oldExt === ext) continue;
    await fs.unlink(path.join(AVATAR_DIR, `${userId}.${oldExt}`)).catch(() => undefined);
  }

  return `/uploads/avatars/${filename}`;
}
