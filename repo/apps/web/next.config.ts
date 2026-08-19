import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone", // Azure App Service: self-contained server.js, avoids Oryx's node_modules repackaging
  serverExternalPackages: ["puppeteer"], // keep Chromium out of the bundle; it's loaded at runtime
  // /api/* is proxied by src/app/api/[[...path]]/route.ts (reads process.env.API_URL
  // at request time) instead of a next.config rewrite — under output: "standalone",
  // rewrites() destinations are frozen into the build artifact at build time, so a
  // runtime env var change (e.g. in Azure App Settings) would never take effect.
};

export default nextConfig;
