import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // Disable X-Powered-By: Next.js to eliminate framework fingerprinting
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Apply defensive HTTP security headers globally across all routes
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
