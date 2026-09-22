import { notFound } from "next/navigation";

import * as mediaService from "@/server/services/media";

import { updateAltTextForm } from "../actions";
import { CopyUrlButton } from "../copy-url-button";
import { DeleteMediaButton } from "./delete-media-button";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const STATUS_TONE: Record<string, string> = {
  READY: "border-accent/40 text-accent",
  PENDING: "border-border text-text-muted",
  REJECTED: "border-border text-text-muted opacity-60",
};

const REFERENCE_LABELS = {
  projects: "a Project cover",
  research: "a Research cover",
  articles: "an Article cover",
  evidence: "an Evidence item",
  siteSettings: "Site Settings (logo, favicon, or default OG image)",
} as const;

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; deleteError?: string }>;
}) {
  const { id } = await params;
  const { saved, deleteError } = await searchParams;
  const media = await mediaService.getMediaById(id);
  if (!media) notFound();

  const references = await mediaService.getMediaReferences(id);
  const referencedBy = (Object.keys(references) as (keyof typeof references)[]).filter(
    (key) => references[key],
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-text truncate font-sans text-2xl font-semibold">
          {media.filename}
        </h1>
        <span
          className={`rounded-badge border px-2 py-0.5 font-mono text-xs ${STATUS_TONE[media.status] ?? "border-border text-text-muted"}`}
        >
          {media.status}
        </span>
      </div>

      <div className="rounded-panel border-border bg-bg/50 mt-6 overflow-hidden border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.storageUrl}
          alt={media.altText ?? media.filename}
          className="max-h-[420px] w-full object-contain"
        />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-xs">
        <div>
          <dt className="text-text-muted">MIME type</dt>
          <dd className="text-text mt-0.5">{media.mimeType}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Dimensions</dt>
          <dd className="text-text mt-0.5">
            {media.width && media.height ? `${media.width}×${media.height}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">File size</dt>
          <dd className="text-text mt-0.5">{formatBytes(media.sizeBytes)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Uploaded</dt>
          <dd className="text-text mt-0.5">
            {new Date(media.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-muted">Storage key</dt>
          <dd className="text-text mt-0.5 truncate">{media.storageKey}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-muted">Public URL</dt>
          <dd className="text-text mt-0.5 flex items-center gap-3">
            <span className="truncate">{media.storageUrl}</span>
            <CopyUrlButton url={media.storageUrl} />
          </dd>
        </div>
      </dl>

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-text font-sans text-sm font-medium">Alt text</h2>
        <form action={updateAltTextForm} className="mt-3 space-y-3">
          <input type="hidden" name="mediaId" value={media.id} />
          <textarea
            name="altText"
            defaultValue={media.altText ?? ""}
            rows={2}
            maxLength={300}
            placeholder="Describe this image for accessibility and SEO"
            className="rounded-card border-border bg-surface text-text focus-visible:border-accent w-full border px-3.5 py-2.5 font-serif text-sm outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-card border-border text-text hover:border-accent border px-4 py-2 font-sans text-sm transition-colors"
            >
              Save alt text
            </button>
            {saved ? (
              <span className="text-accent font-sans text-xs">Saved.</span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-text font-sans text-sm font-medium">Delete</h2>

        {referencedBy.length > 0 ? (
          <div className="rounded-panel border-border bg-surface mt-3 border p-4">
            <p className="text-text-muted font-serif text-sm">
              This media can&apos;t be deleted — it&apos;s still used by{" "}
              {referencedBy.map((key, i) => (
                <span key={key}>
                  {i > 0 ? (i === referencedBy.length - 1 ? " and " : ", ") : ""}
                  {REFERENCE_LABELS[key]}
                </span>
              ))}
              . Remove it from there first.
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <DeleteMediaButton mediaId={media.id} filename={media.filename} />
            {deleteError ? (
              <p className="text-text-muted mt-2 font-mono text-xs">{deleteError}</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
