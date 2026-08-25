import { Plus_Jakarta_Sans } from "next/font/google";

// Used only for the "VajaBaki" wordmark on the public landing/contact pages — everything else keeps the Geist font from layout.tsx.
export const landingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-landing",
});
