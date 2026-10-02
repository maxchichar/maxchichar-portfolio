import assert from "node:assert";
import { describe, it } from "node:test";

import nextConfig from "../next.config";
import {
  buildCspHeader,
  buildPermissionsPolicy,
  buildSecurityHeaders,
  extractStorageOrigin,
} from "../src/lib/security-headers";

describe("Defensive HTTP Security Headers (Level 9.7)", () => {
  describe("Information disclosure & Next.js config", () => {
    it("poweredByHeader is explicitly set to false", () => {
      assert.strictEqual(
        nextConfig.poweredByHeader,
        false,
        "poweredByHeader must be false to prevent X-Powered-By leakage",
      );
    });

    it("headers() function is configured and applies globally to /:path*", async () => {
      assert.ok(typeof nextConfig.headers === "function");
      const rules = await nextConfig.headers();
      assert.ok(Array.isArray(rules));
      assert.strictEqual(rules.length, 1);
      const [firstRule] = rules;
      assert.ok(firstRule, "Expected first header rule to exist");
      assert.strictEqual(firstRule.source, "/:path*");
      assert.ok(Array.isArray(firstRule.headers));
      assert.ok(firstRule.headers.length >= 7);
    });
  });

  describe("Content Security Policy (CSP)", () => {
    it("builds a restrictive baseline CSP with default-src 'self'", () => {
      const csp = buildCspHeader({ isDev: false });
      assert.ok(csp.includes("default-src 'self'"));
    });

    it("enforces strict hardening directives: object-src 'none', base-uri 'self', frame-ancestors 'none', form-action 'self'", () => {
      const csp = buildCspHeader({ isDev: false });
      assert.ok(
        csp.includes("object-src 'none'"),
        "Must block plugins via object-src 'none'",
      );
      assert.ok(csp.includes("base-uri 'self'"), "Must restrict base-uri to 'self'");
      assert.ok(
        csp.includes("frame-ancestors 'none'"),
        "Must block framing via frame-ancestors 'none'",
      );
      assert.ok(
        csp.includes("form-action 'self'"),
        "Must restrict form-action to 'self'",
      );
      assert.ok(
        csp.includes("frame-src 'none'"),
        "Must block frame-src as no iframes are used",
      );
      assert.ok(
        csp.includes("font-src 'self'"),
        "Must restrict font-src to self-hosted fonts",
      );
      assert.ok(
        csp.includes("manifest-src 'self'"),
        "Must restrict manifest-src to 'self'",
      );
    });

    it("never includes wildcard '*' in any directive", () => {
      const csp = buildCspHeader({
        isDev: false,
        storageEndpoint: "https://my-bucket.r2.cloudflarestorage.com",
      });
      const directives = csp.split(";").map((d) => d.trim());
      for (const directive of directives) {
        const parts = directive.split(/\s+/);
        const name = parts[0];
        const sources = parts.slice(1);
        assert.ok(
          !sources.includes("*"),
          `Directive "${name}" must not contain wildcard source "*": ${directive}`,
        );
      }
    });

    it("strictly excludes 'unsafe-eval' from production policy", () => {
      const prodCsp = buildCspHeader({ isDev: false });
      assert.ok(
        !prodCsp.includes("'unsafe-eval'"),
        "Production CSP must NEVER contain 'unsafe-eval'",
      );

      // In dev mode, unsafe-eval is permitted for Turbopack/Fast Refresh
      const devCsp = buildCspHeader({ isDev: true });
      assert.ok(
        devCsp.includes("'unsafe-eval'"),
        "Development CSP allows 'unsafe-eval' for local hot reloading",
      );
    });

    it("allows 'unsafe-inline' for scripts and styles to maintain Next.js App Router streaming hydration", () => {
      const csp = buildCspHeader({ isDev: false });
      assert.ok(csp.includes("script-src 'self' 'unsafe-inline'"));
      assert.ok(csp.includes("style-src 'self' 'unsafe-inline'"));
    });

    it("permits data: and blob: in img-src for local placeholders and admin file previews", () => {
      const csp = buildCspHeader({ isDev: false });
      assert.ok(csp.includes("img-src 'self' data: blob:"));
    });

    it("allows only the exact configured R2 storage origin without wildcards", () => {
      const r2Endpoint =
        "https://78e9572eb3b3a383df856312eaa86b71.r2.cloudflarestorage.com";
      const csp = buildCspHeader({ isDev: false, storageEndpoint: r2Endpoint });

      assert.ok(csp.includes(`img-src 'self' data: blob: ${r2Endpoint}`));
      assert.ok(csp.includes(`connect-src 'self' ${r2Endpoint}`));
      assert.ok(csp.includes(`media-src 'self' ${r2Endpoint}`));
      assert.ok(
        !csp.includes("*.cloudflarestorage.com"),
        "Must not wildcard Cloudflare domain",
      );
      assert.ok(!csp.includes("*.cloudflare.com"), "Must not wildcard Cloudflare domain");
    });

    it("extractStorageOrigin safely extracts origins and ignores null/invalid endpoints", () => {
      assert.strictEqual(
        extractStorageOrigin("https://example-bucket.r2.cloudflarestorage.com/path"),
        "https://example-bucket.r2.cloudflarestorage.com",
      );
      assert.strictEqual(extractStorageOrigin(null), null);
      assert.strictEqual(extractStorageOrigin(""), null);
      assert.strictEqual(extractStorageOrigin("   "), null);
    });
  });

  describe("Standard Security Headers", () => {
    it("X-Content-Type-Options is nosniff", () => {
      const headers = buildSecurityHeaders({ isDev: false });
      const h = headers.find((x) => x.key === "X-Content-Type-Options");
      assert.ok(h);
      assert.strictEqual(h.value, "nosniff");
    });

    it("X-Frame-Options is DENY", () => {
      const headers = buildSecurityHeaders({ isDev: false });
      const h = headers.find((x) => x.key === "X-Frame-Options");
      assert.ok(h);
      assert.strictEqual(h.value, "DENY");
    });

    it("Referrer-Policy is strict-origin-when-cross-origin", () => {
      const headers = buildSecurityHeaders({ isDev: false });
      const h = headers.find((x) => x.key === "Referrer-Policy");
      assert.ok(h);
      assert.strictEqual(h.value, "strict-origin-when-cross-origin");
    });

    it("Cross-Origin-Opener-Policy is same-origin", () => {
      const headers = buildSecurityHeaders({ isDev: false });
      const h = headers.find((x) => x.key === "Cross-Origin-Opener-Policy");
      assert.ok(h);
      assert.strictEqual(h.value, "same-origin");
    });

    it("Cross-Origin-Resource-Policy is same-origin", () => {
      const headers = buildSecurityHeaders({ isDev: false });
      const h = headers.find((x) => x.key === "Cross-Origin-Resource-Policy");
      assert.ok(h);
      assert.strictEqual(h.value, "same-origin");
    });
  });

  describe("Permissions-Policy", () => {
    it("disables camera, microphone, geolocation, payment, and unnecessary hardware APIs", () => {
      const policy = buildPermissionsPolicy();
      const requiredDisabled = [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "bluetooth=()",
        "serial=()",
        "accelerometer=()",
        "gyroscope=()",
        "magnetometer=()",
      ];

      for (const item of requiredDisabled) {
        assert.ok(policy.includes(item), `Permissions-Policy must include "${item}"`);
      }
    });
  });

  describe("Strict-Transport-Security (HSTS)", () => {
    it("production policy includes max-age=31536000 and includeSubDomains without preload", () => {
      const headers = buildSecurityHeaders({ isDev: false });
      const h = headers.find((x) => x.key === "Strict-Transport-Security");
      assert.ok(h, "HSTS header must be present in production");
      assert.strictEqual(h.value, "max-age=31536000; includeSubDomains");
      assert.ok(
        !h.value.includes("preload"),
        "Preload must not be added unless domain is permanently pinned",
      );
    });

    it("omits HSTS in development mode to prevent broken localhost HTTP workflows", () => {
      const headers = buildSecurityHeaders({ isDev: true });
      const h = headers.find((x) => x.key === "Strict-Transport-Security");
      assert.strictEqual(h, undefined, "HSTS must NOT be set in development mode");
    });
  });
});
