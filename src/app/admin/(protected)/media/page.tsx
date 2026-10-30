import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import * as mediaService from "@/server/services/media";
import { DocumentTile } from "@/components/admin/document-tile";
import { MediaImage } from "@/components/media-image";

import { CopyUrlButton } from "./copy-url-button";
import { DeleteMediaButton } from "./[id]/delete-media-button";
import { LibraryUploader } from "./library-uploader";

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
  searchParams: Promise<{
    q?: string;
    status?: string;
    deleted?: string;
    deleteError?: string;
  }>;
}) {
  const { q, status: rawStatus, deleted, deleteError } = await searchParams;
  const status = parseStatus(rawStatus);
  const filenameQuery = q?.trim() || undefined;

  const media = await mediaService.listMediaLibrary({ status, filenameQuery });
  const filtersActive = status !== "READY" || Boolean(filenameQuery);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="Media Library"
        description={`${media.length} ${media.length === 1 ? "file" : "files"}. Every upload is validated server-side before it can be used.`}
      />
      {deleted ? (
        <p role="status" className="text-accent -mt-6 mb-6 font-sans text-sm">
          Media deleted.
        </p>
      ) : null}

      {deleteError ? (
        <p
          role="alert"
          className="rounded-card border-border bg-surface-2 text-text -mt-4 mb-6 border px-4 py-3 font-sans text-sm"
        >
          {deleteError} Replace or remove it there first, then delete it here.
        </p>
      ) : null}

      <LibraryUploader />

      <form
        action="/admin/media"
        method="GET"
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3"
      >
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search filename…"
          type="search"
          aria-label="Search filename"
          className="rounded-card border-border bg-surface text-text focus-visible:border-accent col-span-2 w-full border px-3.5 py-2.5 font-sans text-base outline-none sm:min-w-48 sm:flex-1 sm:py-2 sm:text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Status"
          className="rounded-card border-border bg-surface text-text focus-visible:border-accent min-w-0 border px-3.5 py-2.5 font-sans text-sm outline-none sm:py-2"
        >
          <option value="READY">Ready</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All statuses</option>
        </select>
        <button
          type="submit"
          className="rounded-card border-border text-text hover:border-accent border px-4 py-2.5 font-sans text-sm transition-colors sm:py-2"
        >
          Filter
        </button>
        {filtersActive ? (
          <Link
            href="/admin/media"
            className="text-text-muted hover:text-text col-span-2 py-1 font-sans text-xs sm:col-span-1"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {media.length === 0 ? (
        <div className="rounded-panel border-border bg-surface mt-6 border p-6 sm:mt-8 sm:p-8">
          <p className="text-text-muted font-serif text-sm">
            {filtersActive
              ? "No media matches your search."
              : "No media uploaded yet. Cover images uploaded from a Project, Research, or Article editor will appear here once validated."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((item) => (
            <div
              key={item.id}
              className="group rounded-panel border-border bg-surface hover:border-text/25 flex min-w-0 flex-col overflow-hidden border transition-colors"
            >
              <Link href={`/admin/media/${item.id}`}>
                <div className="border-border bg-bg/50 relative aspect-square w-full overflow-hidden border-b">
                  {item.mimeType.startsWith("image/") ? (
                    <MediaImage
                      src={item.storageUrl}
                      alt={item.altText ?? item.filename}
                      fill
                      sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <DocumentTile />
                  )}
                </div>
                <div className="min-w-0 px-3 pt-3">
                  <p className="text-text truncate font-sans text-xs font-medium">
                    {item.filename}
                  </p>
                  <p className="text-text-muted mt-1 truncate font-mono text-[11px] sm:text-xs">
                    {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                    {formatBytes(item.sizeBytes)}
                  </p>
                  <p className="text-text-muted mt-0.5 font-mono text-[11px] sm:text-xs">
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </Link>
              <div className="mt-auto grid grid-cols-2 gap-2 p-3">
                <CopyUrlButton url={item.storageUrl} compact />
                <DeleteMediaButton mediaId={item.id} filename={item.filename} compact />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
