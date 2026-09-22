import Link from "next/link";

import * as mediaService from "@/server/services/media";

import { CopyUrlButton } from "./copy-url-button";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const STATUS_OPTIONS = ["READY", "PENDING", "REJECTED", "ALL"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

function parseStatus(value: string | undefined): StatusOption {
  return (STATUS_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as StatusOption)
    : "READY";
}

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status: rawStatus } = await searchParams;
  const status = parseStatus(rawStatus);
  const filenameQuery = q?.trim() || undefined;

  const media = await mediaService.listMediaLibrary({ status, filenameQuery });
  const filtersActive = status !== "READY" || Boolean(filenameQuery);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-text font-sans text-2xl font-semibold">Media Library</h1>
      <p className="text-text-muted mt-1 font-serif text-sm">
        {media.length} {media.length === 1 ? "file" : "files"}
      </p>

      <form
        action="/admin/media"
        method="GET"
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search filename…"
          className="rounded-card border-border bg-surface text-text focus-visible:border-accent min-w-48 flex-1 border px-3.5 py-2 font-sans text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-card border-border bg-surface text-text focus-visible:border-accent border px-3.5 py-2 font-sans text-sm outline-none"
        >
          <option value="READY">Ready</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All statuses</option>
        </select>
        <button
          type="submit"
          className="rounded-card border-border text-text hover:border-accent border px-4 py-2 font-sans text-sm transition-colors"
        >
          Filter
        </button>
        {filtersActive ? (
          <Link
            href="/admin/media"
            className="text-text-muted hover:text-text font-sans text-xs"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {media.length === 0 ? (
        <div className="rounded-panel border-border bg-surface mt-8 border p-8">
          <p className="text-text-muted font-serif text-sm">
            {filtersActive
              ? "No media matches your search."
              : "No media uploaded yet. Cover images uploaded from a Project, Research, or Article editor will appear here once validated."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="rounded-panel border-border bg-surface overflow-hidden border"
            >
              <Link href={`/admin/media/${item.id}`} className="hover:opacity-90">
                <div className="border-border bg-bg/50 aspect-square w-full overflow-hidden border-b">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.storageUrl}
                    alt={item.altText ?? item.filename}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-3 pt-3">
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
                </div>
              </Link>
              <div className="p-3 pt-3">
                <CopyUrlButton url={item.storageUrl} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
