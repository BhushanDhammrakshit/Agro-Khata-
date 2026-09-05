import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { AppUserProvider } from "@/lib/AppUserContext";
import { RouteProgress } from "@/components/RouteProgress";
import { ThemeProvider } from "@/lib/ThemeProvider";

// Runs before hydration so the correct theme class is set immediately (no flash of the wrong theme).
// Pre-auth pages (landing/login/register) are always light — theme is a per-user preference, only applied once logged in.
const THEME_INIT_SCRIPT = `(function(){try{var p=window.location.pathname;if(p==="/"||p==="/login"||p==="/register"||p==="/contact"){return;}var t=localStorage.getItem("vajabaki-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const SITE_URL = "https://www.vajabaki.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VajaBaki — GST Billing & Vendor Ledger Software for Agro Businesses",
    template: "%s | VajaBaki",
  },
  description:
    "VajaBaki is billing and ledger software for agro traders, mandis, and vendors — GST invoicing, party ledgers, expense tracking, driver/vehicle records, and business reports in one app.",
  keywords: [
    "agro billing software",
    "mandi billing software",
    "GST invoicing software",
    "vendor bill management",
    "farmer purchase entry software",
    "party ledger software",
    "agro business accounting",
    "VajaBaki",
  ],
  authors: [{ name: "VajaBaki" }],
  applicationName: "VajaBaki",
  // Google Search does NOT support SVG favicons — it needs a PNG/ICO fallback,
  // otherwise it silently shows a generic placeholder icon in search results.
  // favicon.png is a rendered copy of favicon.svg (same design, rasterized).
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "VajaBaki",
    title: "VajaBaki — GST Billing & Vendor Ledger Software for Agro Businesses",
    description:
      "GST-compliant invoicing, party ledgers, expense tracking, and business reports for agro traders, mandis, and vendors.",
    images: [{ url: "/VajaBaki.png", width: 512, height: 512, alt: "VajaBaki logo" }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "VajaBaki — GST Billing & Vendor Ledger Software for Agro Businesses",
    description:
      "GST-compliant invoicing, party ledgers, expense tracking, and business reports for agro traders, mandis, and vendors.",
    images: ["/VajaBaki.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
