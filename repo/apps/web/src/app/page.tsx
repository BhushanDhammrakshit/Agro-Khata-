"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function Home() {
  const { dict } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-white">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white shadow-md">
          <Image src="/VajaBaki.png" alt="VajaBaki" fill className="object-contain p-1" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{dict.landing.title}</h1>
        <p className="text-slate-600">{dict.landing.tagline}</p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">{dict.landing.login}</Link>
          <Link href="/register" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{dict.landing.register}</Link>
        </div>
      </main>
    </div>
  );
}
