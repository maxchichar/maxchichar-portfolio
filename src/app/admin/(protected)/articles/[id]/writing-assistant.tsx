"use client";

import { useState, useTransition } from "react";

import { mergeTags, type AssistKind, type AssistResult } from "@/lib/ai/article-assist";

import { assistArticleAction } from "../actions";

const ACTIONS: { kind: AssistKind; label: string; busy: string }[] = [
  { kind: "excerpt", label: "Suggest excerpt", busy: "Writing an excerpt…" },
  { kind: "titles", label: "Suggest titles", busy: "Thinking of titles…" },
  { kind: "tags", label: "Suggest tags", busy: "Choosing tags…" },
  { kind: "review", label: "Review draft", busy: "Reading the draft…" },
];

/**
 * Sets a form field the way typing would, so controlled fields (the excerpt
 * counter) update and the unsaved-changes guard notices.
 */
function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(field),
    "value",
  )?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  field.focus();
}

/**
 * The admin writing assistant: asks Claude for an excerpt, titles, tags or an
 * editorial review of the draft as it is on screen. Suggestions are only
 * shown; "Use" copies one into its field, and the draft is saved and
 * published by the author as usual. A used suggestion marks the saved draft
 * as AI-assisted.
 */
export function WritingAssistant({
  articleId,
  formId,
}: {
  articleId: string;
  formId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<AssistKind | null>(null);
  const [result, setResult] = useState<AssistResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState("");
  const [usedGenerationId, setUsedGenerationId] = useState("");
  const [applied, setApplied] = useState<string | null>(null);

  function field(name: string) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const el = form?.elements.namedItem(name);
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? el
      : null;
  }

  function run(kind: AssistKind) {
    setError(null);
    setApplied(null);
    setRunning(kind);
    startTransition(async () => {
      const response = await assistArticleAction({
        articleId,
        kind,
        title: field("title")?.value ?? "",
        excerpt: field("excerpt")?.value ?? "",
        content: field("content")?.value ?? "",
      }).catch(() => ({
        ok: false as const,
        error: "The assistant couldn't be reached. Try again.",
      }));
      setRunning(null);
      if (response.ok) {
        setResult(response.result);
        setGenerationId(response.generationId);
      } else {
        setResult(null);
        setError(response.error);
      }
    });
  }

  function use(name: "title" | "excerpt" | "tags", value: string, note: string) {
    const target = field(name);
    if (!target) return;
    setFieldValue(
      target,
      name === "tags" ? mergeTags(target.value, value.split("\n")) : value,
    );
    setUsedGenerationId(generationId);
    setApplied(note);
  }

  const useButton =
    "border-border text-text hover:border-text shrink-0 rounded-full border px-3 py-1 font-sans text-xs font-medium transition-colors";

  return (
    <div>
      <input type="hidden" name="aiGenerationId" value={usedGenerationId} />
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.kind}
            type="button"
            disabled={pending}
            onClick={() => run(action.kind)}
            className="border-border text-text hover:border-text rounded-full border px-4 py-2 font-sans text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-50"
          >
            {running === action.kind ? action.busy : action.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="mt-4 space-y-3 empty:hidden">
        {error ? (
          <p role="alert" className="text-accent font-sans text-sm">
            {error}
          </p>
        ) : null}

        {result?.kind === "excerpt" ? (
          <div className="rounded-card border-border flex flex-col gap-3 border p-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-text font-serif text-sm">{result.excerpt}</p>
            <button
              type="button"
              className={useButton}
              onClick={() => use("excerpt", result.excerpt, "Excerpt updated.")}
            >
              Use
            </button>
          </div>
        ) : null}

        {result?.kind === "titles" ? (
          <ul className="space-y-2">
            {result.titles.map((title) => (
              <li
                key={title}
                className="rounded-card border-border flex items-center justify-between gap-3 border p-3"
              >
                <span className="text-text min-w-0 font-sans text-sm font-medium [overflow-wrap:anywhere]">
                  {title}
                </span>
                <button
                  type="button"
                  className={useButton}
                  onClick={() => use("title", title, "Title updated.")}
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {result?.kind === "tags" ? (
          <div className="rounded-card border-border flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-wrap gap-2">
              {result.tags.map((tag) => (
                <li
                  key={tag}
                  className="bg-bg text-text border-border rounded-full border px-3 py-1 font-sans text-xs"
                >
                  {tag}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={useButton}
              onClick={() => use("tags", result.tags.join("\n"), "Tags added.")}
            >
              Add tags
            </button>
          </div>
        ) : null}

        {result?.kind === "review" ? (
          <div className="rounded-card border-border space-y-3 border p-4">
            <p className="text-text font-serif text-sm">{result.summary}</p>
            {result.suggestions.length ? (
              <ol className="list-decimal space-y-2 pl-5">
                {result.suggestions.map((s) => (
                  <li key={s.issue} className="text-text font-sans text-sm">
                    <span className="font-medium">{s.issue}</span>{" "}
                    <span className="text-text-muted">{s.suggestion}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}

        {applied ? (
          <p role="status" className="text-text-muted font-sans text-xs">
            {applied} Save the draft to keep it.
          </p>
        ) : null}
      </div>
    </div>
  );
}
