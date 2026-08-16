"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./dictionaries/en";
import { mr } from "./dictionaries/mr";

export type Language = "en" | "mr";
const DICTIONARIES: Record<Language, typeof en> = { en, mr };
const STORAGE_KEY = "agrokhata-lang";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  dict: typeof en;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "mr") {
      setLangState(stored);
    }
  }, []);

  function setLang(next: Language) {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, dict: DICTIONARIES[lang] }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }
  return ctx;
}
