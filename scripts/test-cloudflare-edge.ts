import assert from "node:assert/strict";
import { test } from "node:test";
import { createEdgeWorker } from "../cloudflare-edge.mjs";

const base = "https://chibuezemaxwell.com";
const env = { ADMIN_ORIGIN: "https://chibuezemaxwell.vercel.app" };

test("edge cache isolates HTML from RSC and never forwards admin credentials", async () => {
  const entries = new Map<string, Response>();
  Object.assign(globalThis, {
    caches: {
      default: {
        match: async (key: Request) => entries.get(key.url)?.clone(),
        put: async (key: Request, value: Response) => {
          entries.set(key.url, value);
        },
      },
    },
  });
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => pending.push(p) };
  const calls: { url: string; init: RequestInit }[] = [];
  const worker = createEdgeWorker(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response("public content", {
      headers: { "Content-Type": "text/html", Vary: "RSC, Next-Router-State-Tree" },
    });
  });
  const req = (path: string, headers: HeadersInit = { Accept: "text/html" }) =>
    new Request(base + path, { headers });
  assert.equal(
    (await worker.fetch(req("/"), env, ctx)).headers.get("X-Portfolio-Cache"),
    "MISS",
  );
  await Promise.all(pending);
  assert.equal(
    (await worker.fetch(req("/"), env, ctx)).headers.get("X-Portfolio-Cache"),
    "HIT",
  );
  assert.equal(calls.length, 1);
  const variants: HeadersInit[] = [
    { Accept: "text/html", RSC: "1" },
    { Accept: "text/html", Cookie: "authjs.session-token=private" },
    { Accept: "text/html", Authorization: "Bearer private" },
    { Accept: "text/html", "Next-Router-State-Tree": "router" },
  ];
  for (const headers of variants)
    assert.equal(
      (await worker.fetch(req("/", headers), env, ctx)).headers.get("X-Portfolio-Cache"),
      "BYPASS",
    );
  for (const call of calls) {
    const h = new Headers(call.init.headers);
    assert.equal(h.has("cookie"), false);
    assert.equal(h.has("authorization"), false);
  }
  assert.equal(
    (await worker.fetch(req("/contact"), env, ctx)).headers.get("X-Portfolio-Cache"),
    "BYPASS",
  );
  assert.equal(
    (await worker.fetch(req("/admin"), env, ctx)).headers.get("location"),
    env.ADMIN_ORIGIN + "/admin",
  );
  assert.equal((await worker.fetch(req("/api/auth/session"), env, ctx)).status, 404);
  for (const path of [
    "/admin",
    "/api/media/upload-request",
    "/preview/work/id",
    "/writing/slug",
  ]) {
    assert.ok(
      (
        await worker.fetch(
          new Request(base + path, { method: "POST", headers: { Origin: base } }),
          env,
          ctx,
        )
      ).status >= 400,
    );
  }
  assert.equal(
    (
      await worker.fetch(
        new Request(base + "/contact", {
          method: "POST",
          headers: { Origin: "https://evil.example" },
        }),
        env,
        ctx,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request(base + "/contact", {
          method: "POST",
          headers: { Origin: base, Cookie: "private", "X-Forwarded-For": "spoofed" },
          body: "form",
        }),
        env,
        ctx,
      )
    ).status,
    200,
  );
  const last = new Headers(calls.at(-1)!.init.headers);
  assert.equal(last.get("origin"), env.ADMIN_ORIGIN);
  assert.equal(last.has("cookie"), false);
  assert.equal(last.has("x-forwarded-for"), false);
});

test("edge never caches responses that set cookies, errors, or redirects", async () => {
  let writes = 0;
  Object.assign(globalThis, {
    caches: {
      default: {
        match: async () => undefined,
        put: async () => {
          writes++;
        },
      },
    },
  });
  for (const response of [
    new Response("personal", {
      headers: { "Content-Type": "text/html", "Set-Cookie": "private=value" },
    }),
    new Response("error", { status: 500 }),
    new Response(null, {
      status: 302,
      headers: { Location: env.ADMIN_ORIGIN + "/writing" },
    }),
  ]) {
    const worker = createEdgeWorker(async () => response);
    const result = await worker.fetch(
      new Request(base, { headers: { Accept: "text/html" } }),
      env,
      { waitUntil: () => {} },
    );
    assert.equal(result.headers.has("set-cookie"), false);
    if (result.status === 302)
      assert.equal(result.headers.get("location"), base + "/writing");
  }
  assert.equal(writes, 0);
});
