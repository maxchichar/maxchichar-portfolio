import assert from "node:assert/strict";
import { test } from "node:test";
import { routeVercelAdmin } from "../src/lib/cloudflare-admin";
import { auth, signIn, handlers } from "../src/lib/auth/config-cloudflare";
const origin = "https://chibuezemaxwell.vercel.app";
const request = (path: string, method = "GET") =>
  new Request(`https://chibuezemaxwell.com${path}`, { method });

test("admin and draft preview navigation goes to the Vercel host", () => {
  for (const path of [
    "/admin",
    "/admin/login?error=1",
    "/admin/projects",
    "/preview/work/id",
    "/%61dmin/login",
  ]) {
    const response = routeVercelAdmin(request(path), origin)!;
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), `${origin}${path}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(routeVercelAdmin(request("/admin", "HEAD"), origin)?.status, 302);
});

test("Workers never forward credentials, uploads or admin mutations", () => {
  for (const path of [
    "/api/auth/session",
    "/api/auth/callback/credentials",
    "/api/media/upload-request",
    "/api/media/id/confirm",
  ]) {
    for (const method of ["GET", "POST"])
      assert.equal(routeVercelAdmin(request(path, method), origin)?.status, 404);
  }
  assert.equal(routeVercelAdmin(request("/admin/login", "POST"), origin)?.status, 405);
  assert.equal(
    routeVercelAdmin(request("/preview/work/id", "POST"), origin)?.status,
    405,
  );
  assert.equal(routeVercelAdmin(request("/api/search"), origin), null);
  assert.equal(routeVercelAdmin(request("/administrator"), origin), null);
  assert.equal(routeVercelAdmin(request("/admin"), "")?.status, 503);
  assert.equal(
    routeVercelAdmin(request("/admin"), "https://chibuezemaxwell.com")?.status,
    503,
  );
});

test("Cloudflare auth stub denies Server Actions reached through public URLs", async () => {
  assert.equal(await auth(), null);
  await assert.rejects(signIn("credentials"), /Vercel admin/);
  assert.equal(handlers.POST().status, 404);
});
