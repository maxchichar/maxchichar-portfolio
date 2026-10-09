"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { MAX_UPLOAD_BYTES } from "@/lib/validation/media";

type Item = {
  name: string;
  state: "uploading" | "validating" | "done" | "error";
  error?: string;
};

/**
 * Drag-and-drop (or click) upload straight into the library, using the same
 * three-step validated flow as the editors: presigned request → direct PUT
 * to storage → server-side byte validation (READY or REJECTED).
 */
export function LibraryUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const update = (name: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.name === name ? { ...i, ...patch } : i)));

  async function uploadOne(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      update(file.name, {
        state: "error",
        error: `Over the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit`,
      });
      return;
    }
    try {
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
        throw new Error(body.error ?? "Could not start the upload");
      }
      const { mediaId, uploadUrl } = await reqRes.json();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");
      update(file.name, { state: "validating" });
      const confirmRes = await fetch(`/api/media/${mediaId}/confirm`, { method: "POST" });
      const confirmBody = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok || confirmBody.media?.status !== "READY") {
        throw new Error(confirmBody.error ?? "Rejected by validation");
      }
      update(file.name, { state: "done" });
    } catch (err) {
      update(file.name, {
        state: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setItems(files.map((f) => ({ name: f.name, state: "uploading" })));
    await Promise.all(files.map(uploadOne));
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mb-8">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-panel flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-6 py-10 text-center transition-colors ${
          over
            ? "border-accent bg-accent/5"
            : "border-border hover:border-text/30 bg-surface"
        }`}
      >
        <span aria-hidden="true" className="text-text-muted text-2xl">
          ⇪
        </span>
        <span className="text-text font-sans text-sm font-medium">
          Drop images here, or click to upload
        </span>
        <span className="text-text-muted font-sans text-xs">
          JPEG, PNG or WebP · up to {MAX_UPLOAD_BYTES / 1024 / 1024}MB each
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {items.map((i) => (
            <li
              key={i.name}
              className="rounded-card bg-surface flex items-center justify-between px-4 py-2 font-sans text-xs"
            >
              <span className="text-text truncate">{i.name}</span>
              <span
                className={`ml-4 shrink-0 font-mono ${
                  i.state === "error"
                    ? "text-text"
                    : i.state === "done"
                      ? "text-accent"
                      : "text-text-muted"
                }`}
              >
                {i.state === "uploading"
                  ? "Uploading…"
                  : i.state === "validating"
                    ? "Validating…"
                    : i.state === "done"
                      ? "Ready ✓"
                      : `Failed — ${i.error}`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
