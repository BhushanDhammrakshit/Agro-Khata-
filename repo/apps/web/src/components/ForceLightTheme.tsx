"use client";

import { useEffect } from "react";

/** Pre-auth pages (landing/login/register) always render light-themed — dark mode is a per-user preference applied only after login. */
export function ForceLightTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}
