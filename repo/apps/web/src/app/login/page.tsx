"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import { PhoneInput, withPrefix } from "@/components/PhoneInput";

export default function LoginPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(""); // 10-digit, +91 prepended before API calls
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.requestOtp(withPrefix(phone));
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.verifyOtp(withPrefix(phone), otp);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-md">A</div>
          <h1 className="text-xl font-semibold text-slate-900">{dict.login.heading}</h1>
        </div>

        <Card>
          {step === "phone" && (
            <form className="flex flex-col gap-4" onSubmit={handleRequestOtp}>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                {dict.login.phoneLabel}
                <PhoneInput required value={phone} onChange={setPhone} />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? dict.login.sending : dict.login.sendOtp}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp}>
              <p className="text-sm text-slate-600">{dict.login.otpHint("+91" + phone)}</p>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                {dict.login.otpLabel}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`${inputClass} tracking-widest`}
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? dict.login.verifying : dict.login.verify}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep("phone")}>
                {dict.login.changeNumber}
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-slate-600">
          {dict.login.newCompany} <a className="font-medium text-emerald-700 hover:underline" href="/register">{dict.login.registerHere}</a>
        </p>
      </main>
    </div>
  );
}
