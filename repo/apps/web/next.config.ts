import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone", // Azure App Service: self-contained server.js, avoids Oryx's node_modules repackaging
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"], // keep Chromium out of the bundle; it's loaded at runtime
  // @sparticuz/chromium's Chromium binary is a Brotli blob decompressed at runtime from a
  // path relative to the package itself — the automatic output-file tracer doesn't detect that
  // access pattern, so it must be force-included or the standalone build silently omits it.
  outputFileTracingIncludes: {
    "/invoice-pdf/\\[kind\\]/\\[id\\]": ["./node_modules/@sparticuz/chromium/**/*"],
  },
  // /api/* is proxied by src/app/api/[[...path]]/route.ts (reads process.env.API_URL
  // at request time) instead of a next.config rewrite — under output: "standalone",
  // rewrites() destinations are frozen into the build artifact at build time, so a
  // runtime env var change (e.g. in Azure App Settings) would never take effect.
};

export default nextConfig;
