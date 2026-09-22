import * as mediaService from "@/server/services/media";

import { CopyUrlButton } from "./copy-url-button";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default async function MediaLibraryPage() {
  // READY-only for this level — PENDING/REJECTED rows aren't fit to browse
  // or copy a public URL from yet.
  const media = await mediaService.listMediaLibrary("READY");

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-text font-sans text-2xl font-semibold">Media Library</h1>
      <p className="text-text-muted mt-1 font-serif text-sm">
        {media.length} {media.length === 1 ? "file" : "files"}
      </p>

      {media.length === 0 ? (
        <div className="rounded-panel border-border bg-surface mt-8 border p-8">
          <p className="text-text-muted font-serif text-sm">
            No media uploaded yet. Cover images uploaded from a Project, Research, or
            Article editor will appear here once validated.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="rounded-panel border-border bg-surface overflow-hidden border"
            >
              <div className="border-border bg-bg/50 aspect-square w-full overflow-hidden border-b">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.storageUrl}
                  alt={item.altText ?? item.filename}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-text truncate font-sans text-xs font-medium">
                  {item.filename}
                </p>
                <p className="text-text-muted mt-1 font-mono text-xs">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {formatBytes(item.sizeBytes)}
                </p>
                <p className="text-text-muted mt-0.5 font-mono text-xs">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="mt-3">
                  <CopyUrlButton url={item.storageUrl} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
