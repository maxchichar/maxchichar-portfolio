import assert from "node:assert";
import { describe, it } from "node:test";

import { cleanEmailHtml, emailDocument, proxyRemoteImages } from "../src/lib/email-html";

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
      /img-src 'self' data: cid:;/,
    );
    assert.doesNotMatch(emailDocument("<p>x</p>", { loadImages: true }), /https?:;/);
    assert.match(emailDocument("<p>x</p>", { loadImages: false }), /default-src 'none'/);
  });
});

describe("proxyRemoteImages", () => {
  const proxy = (url: string) =>
    `/admin/inbox/image?url=${encodeURIComponent(url).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;

  it("points remote img, background and CSS url() images at the proxy", () => {
    const html = proxyRemoteImages(
      `<img src="https://h1.co/logo.png?a=1&amp;b=2" alt="x">` +
        `<img src='http://t.co/p.gif'><img src=//cdn.co/i.png>` +
        `<td background="https://bg.co/b.jpg">` +
        `<div style="background:url(&quot;https://x.co/a(1).png&quot;)">` +
        `<style>.a{background-image:url('https://y.co/b.png')}</style>`,
    );
    assert.ok(html.includes(`src="${proxy("https://h1.co/logo.png?a=1&b=2")}"`), html);
    assert.ok(html.includes(`src="${proxy("http://t.co/p.gif")}"`), html);
    assert.ok(html.includes(`src="${proxy("https://cdn.co/i.png")}"`), html);
    assert.ok(html.includes(`background="${proxy("https://bg.co/b.jpg")}"`), html);
    assert.ok(html.includes(`url(${proxy("https://x.co/a(1).png")})`), html);
    assert.ok(html.includes(`url(${proxy("https://y.co/b.png")})`), html);
    assert.ok(!/https?:\/\//.test(html.replace(/url=[^"')]*/g, "")), html);
  });

  it("leaves embedded images alone", () => {
    const html = `<img src="data:image/png;base64,AAAA"><img src="cid:logo">`;
    assert.strictEqual(proxyRemoteImages(html), html);
  });

  it("drops srcset, which would bypass the proxied src", () => {
    const { html } = cleanEmailHtml(
      `<img src="https://a.co/1.png" srcset="https://a.co/2.png 2x">`,
    );
    assert.ok(!html.includes("srcset"), html);
  });
});
