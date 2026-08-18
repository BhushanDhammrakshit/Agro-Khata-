"use client";

import { createContext, useContext } from "react";
import { en } from "./dictionaries/en";

interface LanguageContextValue {
  dict: typeof en;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const value: LanguageContextValue = { dict: en };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }
  return ctx;
}
