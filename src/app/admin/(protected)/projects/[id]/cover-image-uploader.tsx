"use client";

import { useRef, useState } from "react";

import { MAX_UPLOAD_BYTES } from "@/lib/validation/media";
import { MediaPicker, type MediaPickerItem } from "@/components/admin/media-picker";

// Presigned direct-to-R2 upload is inherently a JS-driven flow — the
// client must PUT the file bytes straight to object storage, which a
// plain HTML form cannot express (docs/SPECIFICATION.md's media flow is
// explicit that the server never proxies the bytes). Everything else in
// this admin UI is a plain progressive-enhancement form by design; this
// is the one genuine, spec-mandated exception, isolated to this single
// small component rather than pulling the whole page into client-side
// rendering.
//
// Level 7.3 adds a second way to set the same coverMediaId hidden field:
// picking an existing READY item from the library instead of uploading a
// new one. Both paths converge on the same setMediaId/setPreviewUrl state
// and the same hidden field, so the save-path's existing server-side
// coverMediaId validation (exists + status=READY) applies identically
// either way — nothing about that validation needed to change.
export function CoverImageUploader({
  initialMediaId,
  initialUrl,
  libraryMedia,
}: {
  initialMediaId: string | null;
  initialUrl: string | null;
  libraryMedia: MediaPickerItem[];
}) {
  const [mediaId, setMediaId] = useState<string | null>(initialMediaId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "validating" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div>
      <label className="text-text-muted block font-sans text-sm">Cover image</label>
      <input type="hidden" name="coverMediaId" value={mediaId ?? ""} />

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="rounded-card border-border mt-2 h-32 w-full border object-cover"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={status === "uploading" || status === "validating"}
          className="text-text-muted file:rounded-card file:border-border file:bg-surface file:text-text font-sans text-sm file:mr-3 file:border file:px-3 file:py-1.5 file:font-sans file:text-sm"
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-card border-border text-text-muted hover:border-accent hover:text-text border px-3 py-1.5 font-sans text-xs transition-colors"
        >
          Browse library
        </button>
        {mediaId && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-text-muted hover:text-text font-sans text-xs"
          >
            Remove
          </button>
        )}
      </div>

      {status === "uploading" && (
        <p className="text-text-muted mt-1 font-mono text-xs">Uploading…</p>
      )}
      {status === "validating" && (
        <p className="text-text-muted mt-1 font-mono text-xs">Validating…</p>
      )}
      {error && (
        <p className="rounded-card border-border bg-surface text-text mt-1 border px-3 py-2 font-sans text-sm">
          {error}
        </p>
      )}

      {pickerOpen && (
        <MediaPicker
          media={libraryMedia}
          currentMediaId={mediaId}
          onSelect={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
