"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";

interface SetPasswordModalProps {
  open: boolean;
  onDone: () => void;
}

// Shown right after a first-time OTP login (account has no password yet) so the
// user can set one for quicker password-based logins next time. Skippable —
// they can keep using OTP indefinitely if they prefer.
export function SetPasswordModal({ open, onDone }: SetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open || typeof document === "undefined") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await api.setPassword(password);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to set password.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">Set a password</h3>
        <p className="mt-1 text-sm text-slate-600">
          You signed in with an OTP. Set a password now so you can log in faster next time.
        </p>
        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            New password
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Confirm password
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onDone}>
              Skip for now
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Set password"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
