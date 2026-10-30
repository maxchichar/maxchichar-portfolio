"use client";

import { useEffect, useRef, useState } from "react";

import { labelClass } from "@/components/admin/editor/styles";
import { INSERT_MARKDOWN_EVENT, type InsertMarkdownDetail } from "@/lib/markdown-paste";

export const EXCERPT_MAX = 300;

/**
 * The article's short summary, shown under the title and in listings. A live
 * counter keeps it short; if a whole article ends up in here, saving is held
 * back and one click moves the text into the body editor (formatted from
 * Markdown) so nothing has to be retyped.
 */
export function ExcerptField({
  defaultValue,
  className,
  hintClassName,
  bodyFieldName = "content",
}: {
  defaultValue: string;
  className: string;
  hintClassName: string;
  bodyFieldName?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLTextAreaElement>(null);
  const tooLong = value.length > EXCERPT_MAX;

  // Block the form's submit (with the browser's own message) while too long.
  useEffect(() => {
    ref.current?.setCustomValidity(
      tooLong
        ? `Keep the excerpt to ${EXCERPT_MAX} characters. The article itself goes in Body.`
        : "",
    );
  }, [tooLong]);

  function moveToBody() {
    window.dispatchEvent(
      new CustomEvent<InsertMarkdownDetail>(INSERT_MARKDOWN_EVENT, {
        detail: { target: bodyFieldName, markdown: value },
      }),
    );
    setValue("");
    // A programmatic change fires no DOM event: tell the unsaved-changes guard.
    ref.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="excerpt" className={labelClass}>
          Excerpt
        </label>
        <span
          aria-live="polite"
          className={`shrink-0 font-mono text-[11px] ${tooLong ? "text-accent font-semibold" : "text-text-muted"}`}
        >
          {value.length.toLocaleString("en-US")} / {EXCERPT_MAX}
        </span>
      </div>
      <textarea
        ref={ref}
        id="excerpt"
        name="excerpt"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        rows={tooLong ? 6 : 2}
        aria-describedby="excerpt-hint"
        className={className}
      />
      {tooLong ? (
        <div
          role="alert"
          className="rounded-card border-accent/40 bg-accent/5 mt-2 flex flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-text font-sans text-xs">
            This looks like the full article. The excerpt is a short summary; the article
            goes in Body below.
          </p>
          <button
            type="button"
            onClick={moveToBody}
            className="bg-text text-bg hover:bg-accent shrink-0 rounded-full px-4 py-1.5 font-sans text-xs font-medium transition-colors"
          >
            Move this text into the body
          </button>
        </div>
      ) : null}
      <p id="excerpt-hint" className={hintClassName}>
        One or two sentences, shown under the title and in listings.
      </p>
    </div>
  );
}
