import type { NextConfig } from "next";
import { resolve } from "node:path";

import { buildSecurityHeaders } from "./src/lib/security-headers";
import { storageRemotePatterns } from "./src/lib/storage/image";

const cloudflare = process.env.PORTFOLIO_CLOUDFLARE_BUILD === "1";

const nextConfig: NextConfig = {
  turbopack: {},
  // Override Next's automatic native-package externalization for this alias.
  transpilePackages: cloudflare ? ["@node-rs/argon2"] : [],

  // Disable X-Powered-By: Next.js to eliminate framework fingerprinting
  poweredByHeader: false,

  webpack(config) {
    if (cloudflare) {
      config.resolve.alias["@node-rs/argon2"] = resolve(
        "src/lib/auth/argon2-cloudflare.ts",
      );
    }
    return config;
  },

  images: {
    // Serve originals from R2; transformations are an optional Cloudflare product.
    unoptimized: cloudflare,
    // Only our own R2 uploads are optimized (see src/lib/storage/image.ts).
    remotePatterns: storageRemotePatterns(),
    // A short list of widths and one quality keeps the number of distinct
    // optimized variants (and Vercel image transformations) small.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [256, 384],
    qualities: [75],
    formats: ["image/webp"],
    // Upload keys are random UUIDs and never reused, so variants never go stale.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },

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
