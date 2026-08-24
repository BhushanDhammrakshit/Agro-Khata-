"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api, AuthUser } from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then((u) => {
      setUser(u);
      setName(u.name);
      setEmail(u.email);
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load profile."));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateMe({ name, email });
      setUser(updated);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setPasswordSaved(false);
    try {
      await api.setPassword(password);
      setPassword("");
      setPasswordSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <AppShell title="My Profile">
      <div className="mx-auto max-w-lg">
        {/* Avatar + basic info card — Vyapar-style top section */}
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user?.name ?? "—"}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Edit Details
          </h2>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-xs text-slate-400">Used to log in — changing this changes your login email.</p>
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {saved && <p className="mb-4 text-sm text-emerald-600">Profile updated successfully.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>

        <form onSubmit={handlePasswordSave} className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Password</h2>
          <p className="mb-4 text-sm text-slate-500">Set a password to log in to this company without an OTP.</p>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {passwordSaved && <p className="mt-3 text-sm text-emerald-600">Password updated successfully.</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
