"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";
import { PhoneInput, withPrefix } from "@/components/PhoneInput";

const initialForm = {
  companyName: "",
  legalName: "",
  address: "",
  contactEmail: "",
  pan: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof initialForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.registerTenant({
        companyName: form.companyName,
        legalName: form.legalName,
        address: form.address || undefined,
        contactEmail: form.contactEmail || undefined,
        pan: form.pan || undefined,
        ownerName: form.ownerName,
        ownerPhone: withPrefix(form.ownerPhone),
        ownerEmail: form.ownerEmail || undefined,
        password: form.password,
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to register company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 p-6">
        <div className="text-center">
          <div className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-2xl bg-white shadow-md">
            <Image src="/AgroKhata.jpeg" alt="AgroKhata" fill className="object-contain p-1" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{dict.register.heading}</h1>
        </div>

        <Card>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-semibold text-slate-700">{dict.register.companySection}</legend>
              <input required placeholder={dict.register.companyName} value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)} className={inputClass} />
              <input required placeholder={dict.register.legalName} value={form.legalName}
                onChange={(e) => update("legalName", e.target.value)} className={inputClass} />
              <input placeholder={dict.register.address} value={form.address}
                onChange={(e) => update("address", e.target.value)} className={inputClass} />
              <input placeholder={dict.register.contactEmail} type="email" value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)} className={inputClass} />
              <input placeholder={dict.register.pan} value={form.pan}
                onChange={(e) => update("pan", e.target.value)} className={inputClass} />
            </fieldset>

            <fieldset className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <legend className="mb-1 text-sm font-semibold text-slate-700">{dict.register.ownerSection}</legend>
              <input required placeholder={dict.register.ownerName} value={form.ownerName}
                onChange={(e) => update("ownerName", e.target.value)} className={inputClass} />
              <PhoneInput required value={form.ownerPhone} onChange={(v) => update("ownerPhone", v)} />
              <input placeholder={dict.register.ownerEmail} type="email" value={form.ownerEmail}
                onChange={(e) => update("ownerEmail", e.target.value)} className={inputClass} />
              <input required minLength={8} placeholder="Password (minimum 8 characters)" type="password"
                autoComplete="new-password" value={form.password}
                onChange={(e) => update("password", e.target.value)} className={inputClass} />
              <input required minLength={8} placeholder="Confirm password" type="password"
                autoComplete="new-password" value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)} className={inputClass} />
            </fieldset>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? dict.register.submitting : dict.register.submit}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-600">
          {dict.register.alreadyRegistered} <Link className="font-medium text-emerald-700 hover:underline" href="/login">{dict.register.login}</Link>
        </p>
      </main>
    </div>
  );
}
