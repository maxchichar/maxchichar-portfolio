"use client";

import { useState } from "react";

// Genuinely content-agnostic — used identically by the Projects, Research,
// and Article cover-image uploaders. The `media` list is fetched once,
// server-side, by the editor page via the existing listMediaLibrary
// service (same one /admin/media itself uses) and passed down as a prop;
// this component does no fetching of its own and duplicates no query.
export interface MediaPickerItem {
  id: string;
  filename: string;
  storageUrl: string;
  width: number | null;
  height: number | null;
}

export function MediaPicker({
  media,
  currentMediaId,
  onSelect,
  onClose,
}: {
  media: MediaPickerItem[];
  currentMediaId: string | null;
  onSelect: (item: MediaPickerItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = media.filter((item) =>
    item.filename.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="bg-bg/80 fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Select cover image from the media library"
      onClick={onClose}
    >
      <div
        className="rounded-panel border-border bg-surface max-h-[80vh] w-full max-w-2xl overflow-hidden border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border flex items-center justify-between border-b p-4">
          <h3 className="text-text font-sans text-sm font-medium">
            Select from media library
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text font-sans text-xs"
          >
            Close
          </button>
        </div>

        <div className="border-border border-b p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filename…"
            autoFocus
            className="rounded-card border-border bg-bg text-text focus-visible:border-accent w-full border px-3.5 py-2 font-sans text-sm outline-none"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-text-muted py-8 text-center font-serif text-sm">
              {media.length === 0
                ? "No ready media in the library yet. Upload one first."
                : "No media matches your search."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`rounded-card border overflow-hidden text-left transition-colors ${
                    item.id === currentMediaId
                      ? "border-accent"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <div className="bg-bg/50 aspect-square w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.storageUrl}
                      alt={item.filename}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="text-text-muted truncate px-2 py-1.5 font-mono text-xs">
                    {item.filename}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
