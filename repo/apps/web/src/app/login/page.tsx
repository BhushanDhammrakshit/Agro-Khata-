"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError, CompanyChoice } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import { SetPasswordModal } from "@/components/SetPasswordModal";
import { ForceLightTheme } from "@/components/ForceLightTheme";

export default function LoginPage() {
  const { dict } = useLanguage();
  const [email, setEmail] = useState("");
  const [companies, setCompanies] = useState<CompanyChoice[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefilledEmail = params.get("email");
    const prefilledTenantId = params.get("tenantId");
    if (!prefilledEmail) return;

    setEmail(prefilledEmail);
    api.listCompanies(prefilledEmail).then((choices) => {
      setCompanies(choices);
      setTenantId(
        choices.some((choice) => choice.tenantId === prefilledTenantId)
          ? prefilledTenantId ?? ""
          : choices[0]?.tenantId ?? "",
      );
    }).catch(() => null);
  }, []);

  async function findCompanies(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const choices = await api.listCompanies(email);
      if (choices.length === 0) {
        setError("No account found for this email address.");
        return;
      }
      setCompanies(choices);
      setTenantId(choices[0].tenantId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to find companies.");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.passwordLogin(email, tenantId, password);
      // Hard nav (not router.push): AppUserContext only fetches me/companies once
      // on mount, so a soft nav would keep showing a stale prior session's tenant.
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.requestOtp(email, tenantId);
      setOtpSent(true);
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
      const { user } = await api.verifyOtp(email, otp, tenantId);
      if (!user.hasPassword) {
        setShowSetPassword(true);
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  function resetEmail() {
    setCompanies([]);
    setTenantId("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setUseOtp(false);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ForceLightTheme />
      <header className="w-full p-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to home
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6 pt-0">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-2xl bg-white shadow-md">
              <Image src="/VajaBaki.png" alt="VajaBaki" fill className="object-contain p-1" />
            </div>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{dict.login.heading}</h1>
        </div>

        <Card>
          {companies.length === 0 ? (
            <form className="flex flex-col gap-4" onSubmit={findCompanies}>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Email address
                <input required type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Finding companies..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={useOtp ? handleVerifyOtp : loginWithPassword}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Email address</span>
                  <button type="button" onClick={resetEmail} className="cursor-pointer text-xs font-medium text-emerald-700 hover:underline">Change</button>
                </div>
                <p className="mt-1 text-sm text-slate-500">{email}</p>
              </div>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Company
                <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={inputClass}>
                  {companies.map((company) => (
                    <option key={company.tenantId} value={company.tenantId}>{company.companyName}</option>
                  ))}
                </select>
              </label>

              {!useOtp ? (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Password
                  <input required minLength={8} type="password" autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </label>
              ) : otpSent ? (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  {dict.login.otpLabel}
                  <input required type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className={`${inputClass} tracking-widest`} />
                </label>
              ) : (
                <p className="text-sm text-slate-600">We will send an OTP to {email}.</p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {useOtp && !otpSent ? (
                <Button type="button" onClick={handleRequestOtp} disabled={loading}>
                  {loading ? dict.login.sending : dict.login.sendOtp}
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? "Signing in..." : useOtp ? dict.login.verify : "Log in"}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => { setUseOtp(!useOtp); setError(null); }}>
                {useOtp ? "Use password instead" : "Use OTP instead"}
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-slate-600">
          {dict.login.newCompany} <Link className="font-medium text-emerald-700 hover:underline" href="/register">{dict.login.registerHere}</Link>
        </p>
      </main>
      <SetPasswordModal open={showSetPassword} onDone={() => (window.location.href = "/dashboard")} />
    </div>
  );
}
