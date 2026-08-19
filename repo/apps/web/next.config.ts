import type { NextConfig } from "next";

const apiUrl = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone", // Azure App Service: self-contained server.js, avoids Oryx's node_modules repackaging
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
