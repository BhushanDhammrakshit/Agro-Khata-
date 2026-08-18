"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, AuthUser, CompanyChoice } from "@/lib/api";

interface AppUserState {
  me: AuthUser | null;
  companies: CompanyChoice[];
  setMe: (me: AuthUser | null) => void;
  setCompanies: (companies: CompanyChoice[]) => void;
}

const AppUserContext = createContext<AppUserState | null>(null);

// Mounted once in the root layout so `me`/`companies` survive client-side
// route changes instead of refetching (and flashing empty) on every page.
export function AppUserProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<CompanyChoice[]>([]);

  useEffect(() => {
    api.prefetch();
    api.getMe().then((user) => {
      setMe(user);
      return api.listCompanies(user.phone);
    }).then(setCompanies).catch(() => null);
  }, []);

  return (
    <AppUserContext.Provider value={{ me, companies, setMe, setCompanies }}>
      {children}
    </AppUserContext.Provider>
  );
}

export function useAppUser() {
  const ctx = useContext(AppUserContext);
  if (!ctx) throw new Error("useAppUser must be used within an AppUserProvider");
  return ctx;
}
