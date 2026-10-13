import assert from "node:assert";
import { describe, it } from "node:test";

import {
  hasRichHtml,
  looksLikeMarkdown,
  markdownToEditorHtml,
} from "../src/lib/markdown-paste";

describe("looksLikeMarkdown", () => {
  it("spots common Markdown", () => {
    for (const text of [
      "### The World Is Not a Finished Product",
      "Intro\n\n- one\n- two",
      "1. first\n2. second",
      "> a quote",
      "before\n\n---\n\nafter",
      "this is **important** text",
      "*On questioning the systems we inherit.*",
      "see [the docs](https://example.com)",
      "```\ncode\n```",
    ]) {
      assert.ok(looksLikeMarkdown(text), text);
    }
  });

  it("leaves ordinary prose alone", () => {
    for (const text of [
      "",
      "Just a sentence.",
      "Two paragraphs.\n\nNo formatting here, 3 * 4 = 12.",
      "Prices rose 5% - then fell.",
      "snake_case_name and file_name.txt",
    ]) {
      assert.ok(!looksLikeMarkdown(text), text);
    }
  });
});

describe("markdownToEditorHtml", () => {
  it("maps headings onto the editor's two levels", () => {
    assert.strictEqual(markdownToEditorHtml("# Title").trim(), "<h2>Title</h2>");
    assert.strictEqual(markdownToEditorHtml("## Part").trim(), "<h2>Part</h2>");
    assert.strictEqual(markdownToEditorHtml("### Sub").trim(), "<h3>Sub</h3>");
    assert.strictEqual(markdownToEditorHtml("#### Deep").trim(), "<h3>Deep</h3>");
  });

  it("keeps paragraphs, emphasis, dividers and lists", () => {
    const html = markdownToEditorHtml(
      "*On questioning.*\n\n---\n\nI've **always** found it strange.\r\n\r\n- one\n- two",
    );
    assert.match(html, /<p><em>On questioning\.<\/em><\/p>/);
    assert.match(html, /<hr>/);
    assert.match(html, /<p>I&#39;ve <strong>always<\/strong> found it strange\.<\/p>/);
    assert.match(html, /<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
  });
});

describe("hasRichHtml", () => {
  it("keeps real formatting from web pages and docs", () => {
    assert.ok(hasRichHtml("<h2>Title</h2><p>x</p>"));
    assert.ok(hasRichHtml('<p>a <strong class="x">b</strong></p>'));
    assert.ok(hasRichHtml("<ul><li>x</li></ul>"));
  });

  it("treats code-editor and plain copies as plain", () => {
    assert.ok(!hasRichHtml(""));
    assert.ok(!hasRichHtml('<div style="color:#ccc"><span>### Title</span></div>'));
    assert.ok(!hasRichHtml("<br><span>**bold**</span>"));
  });
});
