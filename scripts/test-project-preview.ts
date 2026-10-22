import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

import { parseProjectDraftForm } from "../src/lib/validation/project-form";

function editorForm() {
  const form = new FormData();
  form.set("title", "RepoTrace");
  form.set("shortDescription", "Repository analysis");
  form.set("heading_problem", "The Problem");
  form.set(
    "section_problem",
    JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "The latest problem description",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    }),
  );
  form.set("heading_results", "Results");
  form.set("section_results", "The latest results");
  return form;
}

describe("case-study preview form", () => {
  it("submits current rich text and plain text sections while omitting empty fields", () => {
    const parsed = parseProjectDraftForm(editorForm());
    assert.deepEqual(
      parsed.sections.map((s) => s.key),
      ["problem", "results"],
    );
    assert.ok(parsed.sections[0]);
    assert.ok(parsed.sections[1]);
    assert.equal(parsed.sections[0].heading, "The Problem");
    assert.match(
      JSON.stringify(parsed.sections[0].content),
      /The latest problem description/,
    );
    assert.match(JSON.stringify(parsed.sections[1].content), /The latest results/);
  });

  it("keeps a selected cover on the same submission as the latest text", () => {
    const form = editorForm();
    const mediaId = "8ecc6a75-ed1b-4ef9-a91c-9cebd851d864";
    form.set("coverMediaId", mediaId);
    assert.equal(parseProjectDraftForm(form).coverMediaId, mediaId);
    form.set("coverMediaId", "");
    assert.equal(parseProjectDraftForm(form).coverMediaId, null);
    form.delete("coverMediaId");
    assert.equal(parseProjectDraftForm(form).coverMediaId, undefined);
  });

  it("renders submitted text before and after the evidence wall", () => {
    // React's DOM renderer needs the normal condition, rather than the
    // react-server condition used by the service test suite.
    const script = `
      const assert = require('node:assert/strict');
      const {createElement} = require('react');
      const {renderToStaticMarkup} = require('react-dom/server');
      const {CaseStudyView} = require('./src/components/work/case-study-view.tsx');
      const patch = JSON.parse(process.argv[1]);
      const html = renderToStaticMarkup(createElement(CaseStudyView, {
        project: {id:'project', slug:'repotrace'},
        published: {...patch, publishedAt:null},
        evidence: [{id:'evidence', type:'repository', label:'Repository proof'}],
        tags: [], coverUrl:null, next:null,
      }));
      assert.match(html, /<strong>The latest problem description<\\/strong>/);
      assert.match(html, /The latest results/);
      assert.match(html, /Repository proof/);
      assert.ok(html.indexOf('id="problem"') < html.indexOf('id="evidence"'));
      assert.ok(html.indexOf('id="evidence"') < html.indexOf('id="results"'));
    `;
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "-e",
        script,
        JSON.stringify(parseProjectDraftForm(editorForm())),
      ],
      {
        cwd: process.cwd(),
        stdio: "pipe",
      },
    );
  });
});
