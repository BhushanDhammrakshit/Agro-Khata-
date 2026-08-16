"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { superadminApi, ApiError } from "@/lib/superadmin-api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/styles";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await superadminApi.login(email, password);
      router.push("/superadmin/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700 text-lg font-bold text-white shadow-md">A</div>
      <p className="mb-6 text-sm font-medium tracking-wide text-slate-400 uppercase">AgroKhata Superadmin</p>
      <Card className="w-full max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Password
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
