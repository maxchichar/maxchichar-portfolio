"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { hintClass, inputClass, labelClass, textareaClass } from "./styles";

function fit(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`; // + top and bottom border
}

/**
 * A labelled text field for the fixed-page editors: a live character count
 * against the schema's limit, and (for multiline fields) a textarea that
 * grows with its content, so long sections never hide behind a scrollbar.
 */
export function TextField({
  name,
  label,
  defaultValue,
  maxLength,
  hint,
  multiline = true,
  minRows = 3,
}: {
  name: string;
  label: string;
  defaultValue: string;
  maxLength: number;
  hint?: string;
  multiline?: boolean;
  minRows?: number;
}) {
  const [length, setLength] = useState(defaultValue.length);
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const near = length > maxLength * 0.9;

  // Size to the saved text on mount, and re-fit when the column width changes.
  useLayoutEffect(() => {
    const el = ref.current;
    const onResize = () => fit(el);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <span
          className={`font-mono text-[11px] tabular-nums ${near ? "text-accent font-semibold" : "text-text-muted"}`}
        >
          {length.toLocaleString("en-US")} / {maxLength.toLocaleString("en-US")}
        </span>
      </div>
      {multiline ? (
        <textarea
          ref={ref}
          id={id}
          name={name}
          defaultValue={defaultValue}
          required
          maxLength={maxLength}
          rows={minRows}
          aria-describedby={hintId}
          onInput={(e) => {
            setLength(e.currentTarget.value.length);
            fit(e.currentTarget);
          }}
          className={`${textareaClass} resize-none overflow-hidden`}
        />
      ) : (
        <input
          id={id}
          name={name}
          defaultValue={defaultValue}
          required
          maxLength={maxLength}
          aria-describedby={hintId}
          onInput={(e) => setLength(e.currentTarget.value.length)}
          className={inputClass}
        />
      )}
      {hint ? (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
