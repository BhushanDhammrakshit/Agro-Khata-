"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguageSwitcher() {
  const { lang, setLang, dict } = useLanguage();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="sr-only">{dict.language.label}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as "en" | "mr")}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <option value="en">English</option>
        <option value="mr">मराठी</option>
      </select>
    </label>
  );
}
