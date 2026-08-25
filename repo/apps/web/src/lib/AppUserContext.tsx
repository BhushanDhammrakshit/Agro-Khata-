"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, AuthUser, CompanyChoice } from "@/lib/api";

interface AppUserState {
  me: AuthUser | null;
  companies: CompanyChoice[];
  setMe: (me: AuthUser | null) => void;
  setCompanies: (companies: CompanyChoice[]) => void;
}

const AppUserContext = createContext<AppUserState | null>(null);

// Pages that never have a session — skip the getMe()/companies fetch entirely
// instead of relying only on the 401 handler, since there's nothing to prefetch there.
const PUBLIC_PATHS = ["/", "/login", "/register", "/contact", "/superadmin/login"];

// Mounted once in the root layout so `me`/`companies` survive client-side
// route changes instead of refetching (and flashing empty) on every page.
export function AppUserProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<CompanyChoice[]>([]);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;
    api.prefetch();
    api.getMe().then((user) => {
      setMe(user);
      return api.listCompanies(user.email);
    }).then(setCompanies).catch(() => null);
    // Intentionally runs once (on whatever page this provider first mounts on) —
    // it must NOT refetch on every client-side route change within the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
