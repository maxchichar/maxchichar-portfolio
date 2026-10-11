"use client";

import { useRef, useState } from "react";

import { formatFileSize } from "@/lib/file-size";
import { MAX_UPLOAD_BYTES } from "@/lib/validation/media";

export interface DocumentFieldValue {
  filename: string;
  sizeBytes: number;
  updatedAt: string; // ISO
}

/**
 * Single-PDF field (the CV): same presigned request → PUT → confirm flow as
 * ImageField, saved immediately via `onCommit`.
 */
export function DocumentField({
  label,
  hint,
  initial,
  publicHref,
  disabledReason,
  onCommit,
}: {
  label: string;
  hint?: string;
  initial: DocumentFieldValue | null;
  /** Where visitors get the file, shown as an "Open" link. */
  publicHref: string;
  /** When set, uploading is unavailable and this explains why. */
  disabledReason?: string | null;
  onCommit: (mediaId: string | null) => Promise<{ success: boolean; error?: string }>;
}) {
  const [doc, setDoc] = useState<DocumentFieldValue | null>(initial);
  const [status, setStatus] = useState<"idle" | "uploading" | "validating" | "saving">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = status !== "idle";
  const inputId = "document-field-file";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSaved(false);
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`);
      return;
    }

    try {
      setStatus("uploading");
      const reqRes = await fetch("/api/media/upload-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!reqRes.ok) {
        const body = await reqRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start the upload.");
      }
      const { mediaId, uploadUrl } = await reqRes.json();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");

      setStatus("validating");
      const confirmRes = await fetch(`/api/media/${mediaId}/confirm`, { method: "POST" });
      const confirmBody = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok || confirmBody.media?.status !== "READY") {
        throw new Error(
          confirmBody.error ?? "The file isn't a valid PDF and was rejected.",
        );
      }

      setStatus("saving");
      const result = await onCommit(mediaId);
      if (!result.success) throw new Error(result.error ?? "Couldn't save the CV.");
      setDoc({
        filename: file.name,
        sizeBytes: file.size,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setSaved(false);
    setStatus("saving");
    const result = await onCommit(null);
    setStatus("idle");
    if (result.success) setDoc(null);
    else setError(result.error ?? "Couldn't remove the CV.");
  }

  return (
    <div>
      <p className="text-text block font-sans text-sm font-medium">{label}</p>
      {hint ? <p className="text-text-muted mt-0.5 font-sans text-xs">{hint}</p> : null}

      <div className="rounded-card border-border bg-bg mt-3 flex items-center gap-4 border px-4 py-3.5">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-text-muted h-7 w-7 shrink-0"
        >
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
        </svg>
        <div className="min-w-0 flex-1">
          {doc ? (
            <>
              <p className="text-text truncate font-sans text-sm">{doc.filename}</p>
              <p className="text-text-muted font-mono text-[11px]">
                PDF · {formatFileSize(doc.sizeBytes)} · Updated{" "}
                {new Date(doc.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </>
          ) : (
            <p className="text-text-muted font-sans text-sm">
              No CV yet. The Download CV buttons stay hidden until you add one.
            </p>
          )}
        </div>
        {doc ? (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text font-sans text-xs"
          >
            Open ↗
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          aria-disabled={busy || Boolean(disabledReason)}
          className={`rounded-card border-border text-text hover:border-accent hover:text-accent cursor-pointer border px-3 py-1.5 font-sans text-xs transition-colors ${busy || disabledReason ? "pointer-events-none opacity-50" : ""}`}
        >
          {status === "uploading"
            ? "Uploading…"
            : status === "validating"
              ? "Checking PDF…"
              : status === "saving"
                ? "Saving…"
                : doc
                  ? "Replace PDF"
                  : "Upload PDF"}
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          disabled={busy || Boolean(disabledReason)}
          className="sr-only"
        />
        {doc ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="text-text-muted hover:text-text ml-auto font-sans text-xs disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </div>

      {saved && !error ? (
        <p role="status" className="text-text-muted mt-2 font-sans text-xs">
          <span className="text-accent">✓</span> Saved and live on the site
        </p>
      ) : null}
      {disabledReason ? (
        <p className="rounded-card border-border bg-bg text-text mt-2 border px-3 py-2 font-sans text-xs">
          {disabledReason}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-card border-border bg-bg text-text mt-2 border px-3 py-2 font-sans text-xs"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
