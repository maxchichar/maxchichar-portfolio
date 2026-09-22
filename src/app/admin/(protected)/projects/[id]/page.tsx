import { notFound } from "next/navigation";

import { PROJECT_SECTION_KEYS } from "@/lib/validation/project";
import * as projectService from "@/server/services/projects";
import * as mediaService from "@/server/services/media";

import {
  archiveProjectForm,
  ensureDraftForm,
  publishProjectForm,
  rollbackProjectForm,
  saveDraftForm,
  unarchiveProjectForm,
  tiptapDocToPlainText,
} from "../actions";
import { EvidencePanel } from "./evidence-panel";
import { CoverImageUploader } from "./cover-image-uploader";

const SECTION_LABELS: Record<(typeof PROJECT_SECTION_KEYS)[number], string> = {
  problem: "The Problem",
  context: "Context",
  why_it_matters: "Why This Approach",
  hypothesis: "Hypothesis",
  approach: "Approach",
  architecture: "Architecture",
  implementation: "Implementation",
  experiments: "Experiments",
  results: "Results",
  failures: "What Failed",
  tradeoffs: "Tradeoffs",
  lessons: "Lessons",
  limitations: "Limitations",
  future_work: "Future Work",
};

export default async function ProjectEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ evidenceError?: string }>;
}) {
  const { id } = await params;
  const { evidenceError } = await searchParams;
  const state = await projectService.getProjectFullState(id);
  if (!state) notFound();

  const { project, draft, published, versions, evidence, tags } = state;
  const current = draft ?? published;
  if (!current) notFound();

  const currentCoverMedia = draft?.coverMediaId
    ? await projectService.getMediaById(draft.coverMediaId)
    : null;

  // Same existing service /admin/media itself uses — no new query.
  const libraryMedia = draft
    ? await mediaService.listMediaLibrary({ status: "READY" })
    : [];

  const sectionText = (key: string) => {
    const section = (draft?.sections as { key: string; content: unknown }[] | null)?.find(
      (s) => s.key === key,
    );
    return section ? tiptapDocToPlainText(section.content) : "";
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text font-sans text-2xl font-semibold">{current.title}</h1>
          <p className="text-text-muted mt-1 font-mono text-xs">
            /{project.slug} · item status: {project.status}
          </p>
        </div>
        <div className="flex gap-2">
          {published && (
            <span className="rounded-badge border-accent/40 text-accent border px-2 py-0.5 font-mono text-xs">
              PUBLISHED v{published.versionNumber}
            </span>
          )}
          {draft && (
            <span className="rounded-badge border-border text-text-muted border px-2 py-0.5 font-mono text-xs">
              DRAFT v{draft.versionNumber}
            </span>
          )}
        </div>
      </div>

      {!draft && published && (
        <form action={ensureDraftForm} className="mt-6">
          <input type="hidden" name="projectId" value={project.id} />
          <button
            type="submit"
            className="rounded-card border-accent text-accent hover:bg-accent hover:text-bg border px-4 py-2 font-sans text-sm transition-colors"
          >
            Start editing (forks a new draft from the published version)
          </button>
        </form>
      )}

      {draft && (
        <form action={saveDraftForm} className="mt-8 space-y-5">
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <label className="text-text-muted block font-sans text-sm">Title</label>
            <input
              name="title"
              defaultValue={draft.title}
              required
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-text-muted block font-sans text-sm">
              Short description
            </label>
            <textarea
              name="shortDescription"
              defaultValue={draft.shortDescription}
              required
              rows={2}
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-serif text-sm outline-none"
            />
          </div>

          <CoverImageUploader
            initialMediaId={draft.coverMediaId}
            initialUrl={currentCoverMedia?.storageUrl ?? null}
            libraryMedia={libraryMedia.map((m) => ({
              id: m.id,
              filename: m.filename,
              storageUrl: m.storageUrl,
              width: m.width,
              height: m.height,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-text-muted block font-sans text-sm">Category</label>
              <input
                name="category"
                defaultValue={draft.category ?? ""}
                className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-text-muted block font-sans text-sm">Year</label>
              <input
                name="year"
                type="number"
                defaultValue={draft.year ?? ""}
                className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-text-muted block font-sans text-sm">
              Technologies (comma-separated)
            </label>
            <input
              name="technologies"
              defaultValue={(draft.technologies ?? []).join(", ")}
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-text-muted block font-sans text-sm">
              Tags (comma-separated)
            </label>
            <input
              name="tags"
              defaultValue={tags.map((t) => t.name).join(", ")}
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-text-muted block font-sans text-sm">GitHub</label>
              <input
                name="githubUrl"
                defaultValue={draft.githubUrl ?? ""}
                className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-text-muted block font-sans text-sm">Live</label>
              <input
                name="liveUrl"
                defaultValue={draft.liveUrl ?? ""}
                className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-text-muted block font-sans text-sm">Docs</label>
              <input
                name="documentationUrl"
                defaultValue={draft.documentationUrl ?? ""}
                className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
              />
            </div>
          </div>

          <fieldset className="border-border space-y-4 border-t pt-5">
            <legend className="text-text font-sans text-sm font-medium">
              Case study sections — leave blank to omit
            </legend>
            {PROJECT_SECTION_KEYS.map((key) => (
              <div key={key}>
                <label className="text-text-muted block font-sans text-xs">
                  {SECTION_LABELS[key]}
                </label>
                <input
                  type="hidden"
                  name={`heading_${key}`}
                  value={SECTION_LABELS[key]}
                />
                <textarea
                  name={`section_${key}`}
                  defaultValue={sectionText(key)}
                  rows={3}
                  className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1 w-full border px-3.5 py-2.5 font-serif text-sm outline-none"
                />
              </div>
            ))}
          </fieldset>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-card border-border text-text hover:border-accent border px-4 py-2.5 font-sans text-sm transition-colors"
            >
              Save draft
            </button>
          </div>
        </form>
      )}

      {draft && (
        <form action={publishProjectForm} className="mt-4">
          <input type="hidden" name="projectId" value={project.id} />
          <button
            type="submit"
            className="rounded-card bg-accent text-bg px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
          >
            Publish this draft
          </button>
        </form>
      )}

      <EvidencePanel projectId={project.id} evidence={evidence} error={evidenceError} />

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-text font-sans text-sm font-medium">Version history</h2>
        <div className="mt-3 space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="rounded-card border-border bg-surface flex items-center justify-between border px-4 py-2.5"
            >
              <div>
                <span className="text-text-muted font-mono text-xs">
                  v{v.versionNumber} · {v.status}
                </span>
                <span className="text-text ml-2 font-sans text-sm">{v.title}</span>
              </div>
              {v.status === "SUPERSEDED" && !draft && (
                <form action={rollbackProjectForm}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="targetVersionId" value={v.id} />
                  <button
                    type="submit"
                    className="text-accent font-sans text-xs hover:underline"
                  >
                    Restore this version
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-border mt-8 border-t pt-6">
        {project.status === "ACTIVE" ? (
          <form action={archiveProjectForm}>
            <input type="hidden" name="projectId" value={project.id} />
            <button
              type="submit"
              className="text-text-muted hover:text-text font-sans text-xs"
            >
              Archive project
            </button>
          </form>
        ) : (
          <form action={unarchiveProjectForm}>
            <input type="hidden" name="projectId" value={project.id} />
            <button
              type="submit"
              className="text-text-muted hover:text-text font-sans text-xs"
            >
              Unarchive project
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
