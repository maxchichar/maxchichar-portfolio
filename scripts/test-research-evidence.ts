import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evidenceCreateSchema,
  evidenceFieldErrors,
  parseResearchEvidenceForm,
} from "../src/lib/validation/evidence";
import { readEvidenceData } from "../src/lib/evidence-display";

function form(type: string, extra: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    type,
    label: "Test evidence",
    description: "",
    url: "",
    metric: "",
    before: "",
    after: "",
    unit: "",
    ...extra,
  }))
    data.set(key, value);
  return data;
}

test("paper submits label, description and URL with blank optional measurement controls", () => {
  const parsed = parseResearchEvidenceForm(
    form("paper", {
      description: "Published study",
      url: "https://example.org/paper",
      source: "  ",
    }),
  );
  assert.ok(parsed.success);
  assert.equal(parsed.data.type, "paper");
  assert.equal(parsed.data.description, "Published study");
  assert.equal(parsed.data.url, "https://example.org/paper");
  assert.equal(parsed.data.data?.source, undefined);
  assert.ok(!("metric" in (parsed.data.data ?? {})));
});

test("dataset context survives JSON persistence without invented values", () => {
  const parsed = parseResearchEvidenceForm(
    form("dataset", {
      source: "Statistical office",
      observationPeriod: "2020–2024",
      method: "Survey",
      limitations: "Incomplete coverage",
    }),
  );
  assert.ok(parsed.success);
  const stored = JSON.parse(JSON.stringify(parsed.data.data));
  assert.equal(stored.observationPeriod, "2020–2024");
  assert.equal(readEvidenceData(stored)?.context.length, 4);
  assert.equal(readEvidenceData(stored)?.after, "");
});

test("single measurement accepts zero and optional unit; never invents a baseline", () => {
  const parsed = parseResearchEvidenceForm(
    form("measurement", { metric: "Count", value: "0" }),
  );
  assert.ok(parsed.success);
  assert.equal(readEvidenceData(parsed.data.data)?.after, "0");
  assert.equal(readEvidenceData(parsed.data.data)?.before, "");
});

test("comparison requires both values and returns field-specific errors", () => {
  const parsed = parseResearchEvidenceForm(
    form("before_after", { metric: "Count", before: "0" }),
  );
  assert.equal(parsed.success, false);
  if (!parsed.success)
    assert.deepEqual(evidenceFieldErrors(parsed.error.issues), {
      after: "Enter a value.",
    });
});

test("invalid URL, whitespace label, and missing observed value are rejected", () => {
  for (const extra of [{ url: "bad" }, { label: "  " }] as Record<string, string>[])
    assert.equal(parseResearchEvidenceForm(form("paper", extra)).success, false);
  const parsed = parseResearchEvidenceForm(form("measurement", { metric: "Count" }));
  assert.equal(parsed.success, false);
  if (!parsed.success) assert.ok(evidenceFieldErrors(parsed.error.issues).value);
});

test("legacy paired measurements and all legacy types remain accepted and readable", () => {
  const data = { metric: "Latency", before: "30", after: "20", unit: "ms" };
  assert.ok(
    evidenceCreateSchema.safeParse({ type: "measurement", label: "Legacy", data })
      .success,
  );
  assert.equal(readEvidenceData(data)?.before, "30");
  assert.equal(readEvidenceData(data)?.after, "20");
  for (const type of [
    "paper",
    "dataset",
    "repository",
    "benchmark",
    "screenshot",
    "demo",
    "deployment",
  ])
    assert.ok(evidenceCreateSchema.safeParse({ type, label: "Legacy" }).success);
  assert.equal(readEvidenceData({ after: 0, before: 0 })?.after, "0");
  assert.equal(readEvidenceData(null), null);
  assert.equal(readEvidenceData([]), null);
  assert.equal(readEvidenceData({ after: {} })?.after, "");
});

test("public evidence renders single values, context and legacy comparisons without derived claims", async () => {
  const { execFileSync } = await import("node:child_process");
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      `
    const assert = require('node:assert/strict');
    const {createElement} = require('react');
    const {renderToStaticMarkup} = require('react-dom/server');
    const {EvidenceWall} = require('./src/components/work/evidence-wall.tsx');
    const html = renderToStaticMarkup(createElement(EvidenceWall, {items: [
      {id:'paper', type:'paper', label:'Published paper', description:'Paper description', url:'https://example.org/paper', data:null},
      {id:'single', type:'measurement', label:'Observed count', data:{metric:'Count', value:'0', observationPeriod:'2024', source:'Survey source', method:'Sampling', limitations:'Small sample'}},
      {id:'legacy', type:'measurement', label:'Existing result', data:{metric:'Latency', before:'30', after:'20', unit:'ms'}},
    ]}));
    for (const expected of ['Published paper','Paper description','https://example.org/paper','Observed count','Survey source','Sampling','Small sample','2024','Existing result','30','20','ms']) assert.ok(html.includes(expected), expected);
    assert.ok(!html.includes('undefined'));
    assert.ok(!html.includes('NaN'));
    assert.ok(!html.includes('%'));
  `,
    ],
    { env: { ...process.env, NODE_OPTIONS: "" }, stdio: "pipe" },
  );
});
