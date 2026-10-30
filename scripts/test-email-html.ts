import assert from "node:assert";
import { describe, it } from "node:test";

import { cleanEmailHtml, emailDocument } from "../src/lib/email-html";

describe("cleanEmailHtml", () => {
  it("removes scripts, embeds, forms and event handlers", () => {
    const { html } = cleanEmailHtml(
      `<p onclick="x()">Hi</p><script>alert(1)</script><iframe src="https://e.co"></iframe>` +
        `<form action="https://e.co"><input name=a><button>Go</button></form>` +
        `<svg onload=alert(1)><circle/></svg><object data="x"></object>` +
        `<meta http-equiv="refresh" content="0;url=https://e.co"><base href="https://e.co/">` +
        `<img src=x onerror=alert(1)>`,
    );
    assert.ok(
      !/script|iframe|<form|<input|<button|<svg|<object|<meta|<base|onclick|onload|onerror/i.test(
        html,
      ),
      html,
    );
    assert.ok(html.includes("<p>Hi</p>"));
  });

  it("neutralises javascript: and data: links however they're written", () => {
    for (const href of [
      "javascript:alert(1)",
      " JaVaScRiPt:alert(1)",
      "java\tscript:alert(1)",
      "&#106;avascript:alert(1)",
      "&#x6A;avascript&colon;alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
    ]) {
      const { html } = cleanEmailHtml(`<a href="${href}">x</a>`);
      assert.ok(html.includes('href="#"'), `${href} -> ${html}`);
    }
  });

  it("keeps normal links, images and styles", () => {
    const { html } = cleanEmailHtml(
      `<style>.a{color:red}</style><a href="https://site.com/x?y=1" target="_self">Read</a>` +
        `<a href="mailto:a@b.co">Mail</a><img src="data:image/png;base64,AAAA">`,
    );
    assert.ok(html.includes("<style>.a{color:red}</style>"));
    assert.ok(html.includes('href="https://site.com/x?y=1"'));
    assert.ok(html.includes('href="mailto:a@b.co"'));
    assert.ok(html.includes('src="data:image/png;base64,AAAA"'));
    assert.ok(!html.includes("target="), "links open via the document's base target");
    assert.ok(
      html.startsWith("<style>") &&
        html.includes('<a rel="noopener noreferrer nofollow" href='),
    );
  });

  it("notices remote images, including CSS backgrounds", () => {
    assert.strictEqual(
      cleanEmailHtml(`<img src="https://t.co/p.gif">`).remoteImages,
      true,
    );
    assert.strictEqual(
      cleanEmailHtml(`<td background="//cdn.co/bg.png">`).remoteImages,
      true,
    );
    assert.strictEqual(
      cleanEmailHtml(`<div style="background:url('https://x.co/a.png')">`).remoteImages,
      true,
    );
    assert.strictEqual(cleanEmailHtml(`<img src="cid:logo">`).remoteImages, false);
  });
});

describe("emailDocument", () => {
  it("blocks remote images until they're asked for", () => {
    assert.match(emailDocument("<p>x</p>", { loadImages: false }), /img-src data: cid:;/);
    assert.match(
      emailDocument("<p>x</p>", { loadImages: true }),
      /img-src data: cid: https: http:;/,
    );
    assert.match(emailDocument("<p>x</p>", { loadImages: false }), /default-src 'none'/);
  });
});
