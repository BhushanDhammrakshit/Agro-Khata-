"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError, CompanyChoice } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import { PhoneInput, stripPrefix, withPrefix } from "@/components/PhoneInput";
import { SetPasswordModal } from "@/components/SetPasswordModal";

export default function LoginPage() {
  const { dict } = useLanguage();
  const [phone, setPhone] = useState("");
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
    const prefilledPhone = params.get("phone");
    const prefilledTenantId = params.get("tenantId");
    if (!prefilledPhone) return;

    setPhone(stripPrefix(prefilledPhone));
    api.listCompanies(prefilledPhone).then((choices) => {
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
      const choices = await api.listCompanies(withPrefix(phone));
      if (choices.length === 0) {
        setError("No account found for this mobile number.");
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
      await api.passwordLogin(withPrefix(phone), tenantId, password);
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
      await api.requestOtp(withPrefix(phone), tenantId);
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
      const { user } = await api.verifyOtp(withPrefix(phone), otp, tenantId);
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

  function resetPhone() {
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
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="text-center">
          <div className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-2xl bg-white shadow-md">
            <Image src="/AgroKhata.jpeg" alt="AgroKhata" fill className="object-contain p-1" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{dict.login.heading}</h1>
        </div>

        <Card>
          {companies.length === 0 ? (
            <form className="flex flex-col gap-4" onSubmit={findCompanies}>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                {dict.login.phoneLabel}
                <PhoneInput required value={phone} onChange={setPhone} />
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
                  <span className="text-sm font-medium text-slate-700">Mobile number</span>
                  <button type="button" onClick={resetPhone} className="cursor-pointer text-xs font-medium text-emerald-700 hover:underline">Change</button>
                </div>
                <p className="mt-1 text-sm text-slate-500">+91 {phone}</p>
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
                <p className="text-sm text-slate-600">We will send an OTP to +91 {phone}.</p>
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
