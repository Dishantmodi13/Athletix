"use client";

import { LogIn, Save, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/dashboard/ProfileAvatar";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { useUser } from "@/context/UserContext";
import {
  findCountryCodeByName,
  findStateCodeByName,
  getCountryName,
  getStateName,
  useLocationOptions,
} from "@/hooks/useLocationOptions";

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-athletix-text-muted focus:border-athletix-primary/40 disabled:cursor-not-allowed disabled:opacity-60";

const selectClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-athletix-primary/40 disabled:cursor-not-allowed disabled:opacity-50";

export default function ProfilePage() {
  const { user, isGuest, loading, updateProfile } = useUser();

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { countries, states, cities } = useLocationOptions(countryCode, stateCode);

  useEffect(() => {
    if (!user) return;

    setUsername(user.username);
    setPhone(user.phone ?? "");
    setAvatarPreview(user.avatar);

    const code = findCountryCodeByName(user.country);
    setCountryCode(code);
    setStateCode(findStateCodeByName(code, user.state));
    setCity(user.city ?? "");
  }, [user]);

  const handleCountryChange = (value: string) => {
    setCountryCode(value);
    setStateCode("");
    setCity("");
  };

  const handleStateChange = (value: string) => {
    setStateCode(value);
    setCity("");
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      await updateProfile({
        username: username.trim(),
        phone: phone.trim() || null,
        country: countryCode ? getCountryName(countryCode) : null,
        state: stateCode && countryCode ? getStateName(countryCode, stateCode) : null,
        city: city || null,
        avatar: avatarPreview,
      });
      setMessage("Profile saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <SectionHeader title="Profile" icon={<User className="h-5 w-5" />} />
        <div className="auth-glass-card h-64 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (isGuest || !user) {
    return (
      <div className="mx-auto max-w-2xl">
        <SectionHeader title="Profile" icon={<User className="h-5 w-5" />} />
        <div className="auth-glass-card rounded-2xl p-8 text-center">
          <p className="mb-4 text-sm text-athletix-text-muted">
            Sign in to set your username, contact details, and profile picture.
          </p>
          <Link
            href="/auth"
            className="auth-primary-btn inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white"
          >
            <LogIn className="h-4 w-4" /> Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeader title="Profile" icon={<User className="h-5 w-5" />} />

      <div className="auth-glass-card mb-6 flex items-center gap-5 rounded-2xl p-6">
        <ProfileAvatar
          username={username || user.username}
          avatar={avatarPreview}
          size="lg"
          editable
          onAvatarChange={setAvatarPreview}
        />
        <div>
          <p className="text-lg font-semibold text-white">{username || user.username}</p>
          <p className="text-sm text-athletix-text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-athletix-text-muted">Tap the camera to change your photo</p>
        </div>
      </div>

      <form
        className="auth-glass-card space-y-5 rounded-2xl p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div>
          <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-athletix-text-muted">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            placeholder="your_username"
            minLength={3}
            maxLength={30}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-athletix-text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user.email}
            disabled
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-athletix-text-muted">Email is set when you sign in</p>
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-athletix-text-muted">
            Mobile number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="country" className="mb-1.5 block text-xs font-medium text-athletix-text-muted">
              Country
            </label>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => handleCountryChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="state" className="mb-1.5 block text-xs font-medium text-athletix-text-muted">
              State
            </label>
            <select
              id="state"
              value={stateCode}
              onChange={(e) => handleStateChange(e.target.value)}
              className={selectClass}
              disabled={!countryCode || states.length === 0}
            >
              <option value="">Select state</option>
              {states.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-xs font-medium text-athletix-text-muted">
              City
            </label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={selectClass}
              disabled={!stateCode || cities.length === 0}
            >
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="auth-primary-btn flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
