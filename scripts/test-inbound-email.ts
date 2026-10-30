import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEdgeWorker, htmlToText } from "../cloudflare-edge.mjs";
import { senderName } from "../src/server/services/contact-email";
import { inboundEmailSchema } from "../src/lib/validation/contact";

const raw = [
  "From: Ada Lovelace <ada@example.com>",
  "To: hello@chibuezemaxwell.com",
  "Subject: Consulting project",
  "Message-ID: <abc123@example.com>",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Hi Max,",
  "Are you available next week?",
  "",
].join("\r\n");

function fakeMessage() {
  const calls = { forwarded: [] as string[], rejected: null as string | null };
  return {
    calls,
    message: {
      from: "ada@example.com",
      to: "hello@chibuezemaxwell.com",
      raw: new Response(raw).body,
      forward: async (to: string) => {
        calls.forwarded.push(to);
      },
      setReject: (reason: string) => {
        calls.rejected = reason;
      },
    },
  };
}

const env = {
  ADMIN_ORIGIN: "https://admin.chibuezemaxwell.com",
  INBOUND_EMAIL_SECRET: "s3cret",
  EMAIL_FORWARD_TO: "me@example.com",
};

describe("Email worker", () => {
  it("saves the email to the dashboard and forwards it", async () => {
    let posted: { url: string; init: RequestInit } | null = null;
    const worker = createEdgeWorker(async (url, init) => {
      posted = { url: String(url), init: init ?? {} };
      return new Response("{}", { status: 201 });
    });
    const { message, calls } = fakeMessage();
    await worker.email(message, env);

    assert.ok(posted);
    const { url, init } = posted as { url: string; init: RequestInit };
    assert.equal(url, "https://admin.chibuezemaxwell.com/api/inbound-email");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer s3cret");
    const body = JSON.parse(String(init.body));
    assert.deepEqual(body.from, { address: "ada@example.com", name: "Ada Lovelace" });
    assert.equal(body.subject, "Consulting project");
    assert.equal(body.messageId, "<abc123@example.com>");
    assert.match(body.text, /Are you available next week\?/);
    assert.ok(inboundEmailSchema.safeParse(body).success);
    assert.deepEqual(calls.forwarded, ["me@example.com"]);
  });

  it("sends the HTML of a designed email along with its text", async () => {
    const htmlRaw = [
      "From: News <news@example.com>",
      "To: hello@chibuezemaxwell.com",
      "Subject: Weekly",
      'Content-Type: multipart/alternative; boundary="b"',
      "",
      "--b",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Top stories",
      "--b",
      "Content-Type: text/html; charset=utf-8",
      "",
      "<h1>Top stories</h1>",
      "--b--",
      "",
    ].join("\r\n");
    let body: Record<string, unknown> = {};
    const worker = createEdgeWorker(async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response("{}", { status: 201 });
    });
    const { message } = fakeMessage();
    await worker.email({ ...message, raw: new Response(htmlRaw).body }, env);
    assert.match(String(body.text), /Top stories/);
    assert.match(String(body.html), /<h1>Top stories<\/h1>/);
    assert.ok(inboundEmailSchema.safeParse(body).success);
  });

  it("still forwards when the dashboard is down", async () => {
    const worker = createEdgeWorker(async () => new Response("", { status: 503 }));
    const { message, calls } = fakeMessage();
    await worker.email(message, env);
    assert.deepEqual(calls.forwarded, ["me@example.com"]);
    assert.equal(calls.rejected, null);
  });

  it("rejects only when the email reached neither place", async () => {
    const worker = createEdgeWorker(async () => new Response("", { status: 503 }));
    const { message, calls } = fakeMessage();
    await worker.email(message, { ...env, EMAIL_FORWARD_TO: "" });
    assert.ok(calls.rejected);
  });
});

describe("Inbound email helpers", () => {
  it("turns an HTML-only email into readable text", () => {
    assert.equal(
      htmlToText(
        "<style>p{}</style><p>Hello&nbsp;<b>Max</b></p><p>Line&amp;two<br>three</p>",
      ),
      "Hello Max\nLine&two\nthree",
    );
  });

  it("reads the display name from a sender", () => {
    assert.equal(
      senderName("Chibueze Maxwell <hello@chibuezemaxwell.com>"),
      "Chibueze Maxwell",
    );
    assert.equal(senderName('"Max" <hello@chibuezemaxwell.com>'), "Max");
    assert.equal(senderName("hello@chibuezemaxwell.com"), null);
  });
});
