import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { AppUserProvider } from "@/lib/AppUserContext";
import { RouteProgress } from "@/components/RouteProgress";
import { ThemeProvider } from "@/lib/ThemeProvider";

// Runs before hydration so the correct theme class is set immediately (no flash of the wrong theme).
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("vajabaki-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "VajaBaki",
  description: "Vendor bill and farmer purchase management for agro businesses.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <RouteProgress />
        <ThemeProvider>
          <LanguageProvider>
            <AppUserProvider>{children}</AppUserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
