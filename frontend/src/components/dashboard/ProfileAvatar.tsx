"use client";

import { Camera } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { getAvatarUrl, getUserInitials } from "@/lib/user";

interface ProfileAvatarProps {
  username: string;
  avatar: string | null;
  size?: "md" | "lg";
  editable?: boolean;
  onAvatarChange?: (dataUrl: string) => void;
}

const sizeClasses = {
  md: "h-16 w-16 text-xl",
  lg: "h-24 w-24 text-3xl",
};

export function ProfileAvatar({
  username,
  avatar,
  size = "md",
  editable = false,
  onAvatarChange,
}: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarUrl = getAvatarUrl(avatar);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onAvatarChange) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onAvatarChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="relative shrink-0">
      <div
        className={`flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-athletix-primary to-blue-700 font-bold text-white ${sizeClasses[size]}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          getUserInitials(username)
        )}
      </div>

      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-athletix-bg-surface text-white shadow-lg transition-colors hover:bg-athletix-primary"
            aria-label="Change profile photo"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}
