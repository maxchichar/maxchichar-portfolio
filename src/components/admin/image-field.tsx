"use client";

import { useRef, useState } from "react";

import { MAX_UPLOAD_BYTES } from "@/lib/validation/media";
import { MediaPicker, type MediaPickerItem } from "@/components/admin/media-picker";

// Same presigned direct-to-R2 flow as the cover-image uploaders (request →
// PUT → confirm), generalised for any single-image field: the chosen media
// id lands in a hidden input named `name`, and the server re-checks it is
// READY on save. Used by Settings for the hero and About images.
export function ImageField({
  name,
  label,
  hint,
  initialMediaId,
  initialUrl,
  libraryMedia,
  aspect = "aspect-[16/9]",
}: {
  name: string;
  label: string;
  hint?: string;
  initialMediaId: string | null;
  initialUrl: string | null;
  libraryMedia: MediaPickerItem[];
  aspect?: string;
}) {
  const [mediaId, setMediaId] = useState<string | null>(initialMediaId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "validating" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = status === "uploading" || status === "validating";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`);
      setStatus("error");
      return;
    }

    setStatus("uploading");
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
        throw new Error(body.error ?? "Could not start the upload.");
      }
      const { mediaId: newMediaId, uploadUrl } = await reqRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");

      setStatus("validating");
      const confirmRes = await fetch(`/api/media/${newMediaId}/confirm`, {
        method: "POST",
      });
      const confirmBody = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok || confirmBody.media?.status !== "READY") {
        throw new Error(
          confirmBody.error ?? "The file didn't pass validation and was rejected.",
        );
      }

      setMediaId(newMediaId);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  function handlePick(item: MediaPickerItem) {
    setMediaId(item.id);
    setPreviewUrl(item.storageUrl);
    setError(null);
    setStatus("idle");
    setPickerOpen(false);
  }

  function handleRemove() {
    setMediaId(null);
    setPreviewUrl(null);
    setError(null);
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const inputId = `${name}-file`;

  return (
    <div>
      <p className="text-text block font-sans text-sm font-medium">{label}</p>
      {hint ? <p className="text-text-muted mt-0.5 font-sans text-xs">{hint}</p> : null}
      <input type="hidden" name={name} value={mediaId ?? ""} />

      <div
        className={`rounded-card border-border bg-bg relative mt-3 w-full overflow-hidden border ${aspect}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <label
            htmlFor={inputId}
            className="text-text-muted hover:text-text absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed font-sans text-xs transition-colors"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-6 w-6"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="M21 16l-5-5-9 9" strokeLinejoin="round" />
            </svg>
            No image — click to upload
          </label>
        )}
        {busy ? (
          <div className="bg-bg/70 absolute inset-0 flex items-center justify-center">
            <p className="text-text font-mono text-xs">
              {status === "uploading" ? "Uploading…" : "Validating…"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className={`rounded-card border-border text-text hover:border-accent hover:text-accent cursor-pointer border px-3 py-1.5 font-sans text-xs transition-colors ${busy ? "pointer-events-none opacity-50" : ""}`}
        >
          {previewUrl ? "Replace" : "Upload"}
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={busy}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-card border-border text-text-muted hover:border-accent hover:text-text border px-3 py-1.5 font-sans text-xs transition-colors"
        >
          Browse library
        </button>
        {mediaId ? (
          <button
            type="button"
            onClick={handleRemove}
            className="text-text-muted hover:text-text ml-auto font-sans text-xs"
          >
            Remove
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-card border-border bg-bg text-text mt-2 border px-3 py-2 font-sans text-xs"
        >
          {error}
        </p>
      ) : null}

      {pickerOpen ? (
        <MediaPicker
          media={libraryMedia}
          currentMediaId={mediaId}
          onSelect={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
