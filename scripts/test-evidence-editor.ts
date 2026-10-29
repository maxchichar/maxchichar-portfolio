import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const requireModule = createRequire(import.meta.url);

// Execute the real action/component code with only framework and I/O boundaries
// replaced. A redirect is deliberately fatal: it would discard the open draft.
function load(file: string, mocks: Record<string, unknown>) {
  const exports: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  const source = readFileSync(resolve(file), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    exports,
    require: (id: string) => {
      if (id in mocks) return mocks[id];
      return requireModule(id.startsWith("@/") ? resolve("src", id.slice(2)) : id);
    },
    FormData,
  });
  return exports;
}

for (const kind of ["research", "projects"]) {
  test(`${kind}: evidence add, validation failure and removal do not navigate or save the draft`, async () => {
    const writes: unknown[][] = [];
    const refreshed: string[] = [];
    let authenticated = true;
    const actions = load(`src/app/admin/(protected)/${kind}/actions.ts`, {
      "next/navigation": {
        redirect: () => {
          throw new Error("Unexpected navigation");
        },
      },
      "next/cache": { revalidatePath: (path: string) => refreshed.push(path) },
      "@/lib/auth/config": {
        auth: async () => (authenticated ? { user: { id: "admin" } } : null),
      },
      [`@/server/services/${kind}`]: {
        addEvidence: async (...args: unknown[]) => writes.push(args),
        removeEvidence: async (...args: unknown[]) => writes.push(args),
        saveDraft: () => {
          throw new Error("Evidence must not overwrite section content");
        },
      },
    });
    const data = new FormData();
    data.set(kind === "research" ? "researchId" : "projectId", "item");
    data.set("type", "repository");
    data.set("label", "Source repository");
    data.set("url", "https://example.com/repo");
    assert.equal((await actions.addEvidenceForm(data)).error, undefined);
    assert.equal(writes.length, 1);
    assert.equal(refreshed.length, 1);
    data.set("label", "");
    const invalid = await actions.addEvidenceForm(data);
    assert.ok(invalid.error || invalid.fieldErrors);
    assert.equal(writes.length, 1);
    assert.equal(refreshed.length, 1);
    data.set("evidenceId", "evidence");
    await actions.removeEvidenceForm(data);
    assert.equal(writes.length, 2);
    assert.equal(refreshed.length, 2);
    authenticated = false;
    await assert.rejects(actions.removeEvidenceForm(data), /Not authenticated/);
    await assert.rejects(actions.addEvidenceForm(data), /Not authenticated/);
    assert.equal(writes.length, 2);
  });
}

test("evidence form prevents native navigation, duplicate writes and resets on failure", async () => {
  const states: unknown[] = [];
  const { EvidenceForm } = load("src/components/admin/editor/evidence-form.tsx", {
    react: {
      useRef: () => ({ current: false }),
      useState: () => [undefined, (value: unknown) => states.push(value)],
    },
    "react/jsx-runtime": {
      jsx: (type: unknown, props: unknown) => ({ type, props }),
      jsxs: (type: unknown, props: unknown) => ({ type, props }),
    },
  });
  let calls = 0;
  let finish!: (value: { error: string }) => void;
  const form = EvidenceForm({
    action: () => {
      calls++;
      return new Promise((done) => {
        finish = done;
      });
    },
    children: "evidence fields",
  });
  // Node FormData cannot read a DOM form; replace only its constructor input
  // by passing undefined. No reset API is exposed, so any reset fails this test.
  let prevented = 0;
  const event = { preventDefault: () => prevented++, currentTarget: undefined };
  const first = form.props.onSubmit(event);
  await form.props.onSubmit(event);
  assert.equal(calls, 1);
  assert.equal(prevented, 2);
  finish({ error: "Invalid evidence" });
  await first;
  assert.ok(states.includes("Invalid evidence"));
  assert.equal(states.at(-1), false);
  const retry = form.props.onSubmit(event);
  assert.equal(calls, 2);
  finish({ error: "Still invalid" });
  await retry;

  const broken = EvidenceForm({
    action: async () => {
      throw new Error("offline");
    },
  });
  await broken.props.onSubmit(event);
  assert.ok(
    states.some(
      (value) => typeof value === "string" && value.includes("entries are still here"),
    ),
  );
});

test("Settings text survives failed actions and refreshed initial props", () => {
  // useState slots persist across renders by call order, as React's do.
  const slots: unknown[] = [];
  let slot = 0;
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const { SettingsForm } = load("src/app/admin/(protected)/settings/settings-form.tsx", {
    react: {
      useActionState: () => [{ success: false, error: "Invalid input" }, () => {}, false],
      useEffect: () => {},
      useState: (initial: unknown) => {
        const i = slot++;
        if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [
          slots[i],
          (update: unknown) => {
            slots[i] = typeof update === "function" ? update(slots[i]) : update;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@/components/admin/editor/editor-section": { EditorSection: "editor-section" },
    "@/components/admin/image-field": { ImageField: "image-field" },
    "@/components/admin/document-field": { DocumentField: "document-field" },
    "./actions": {},
  });
  const names = [
    "siteName",
    "siteDescription",
    "primaryEmail",
    "socialGithub",
    "socialX",
    "socialLinkedin",
    "socialYoutube",
    "socialInstagram",
    "socialTiktok",
    "footerText",
  ];
  // Renders function components too (the form's own Field), collecting inputs.
  const fields = (node: unknown): Record<string, Record<string, unknown>> => {
    if (Array.isArray(node)) return Object.assign({}, ...node.map(fields));
    if (!node || typeof node !== "object" || !("props" in node)) return {};
    const { type, props } = node as { type: unknown; props: Record<string, unknown> };
    if (typeof type === "function") return fields(type(props));
    return {
      ...fields(props.children),
      ...(type === "input" || type === "textarea" ? { [String(props.name)]: props } : {}),
    };
  };
  const render = (initialSettings: Record<string, string>) => {
    slot = 0;
    return fields(
      SettingsForm({ initialSettings, initialAvatar: null, libraryMedia: [] }),
    );
  };

  const rendered = render(Object.fromEntries(names.map((name) => [name, "Saved"])));
  for (const name of names) {
    const field = rendered[name]!;
    assert.equal(field.value, "Saved");
    (field.onChange as (event: unknown) => void)({
      target: { value: `Unsaved ${name}` },
      currentTarget: { setCustomValidity: () => {} },
    });
  }
  const refreshed = render({});
  for (const name of names) assert.equal(refreshed[name]!.value, `Unsaved ${name}`);
});
