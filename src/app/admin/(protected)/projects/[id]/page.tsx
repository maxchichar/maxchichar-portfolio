import { notFound } from "next/navigation";

import { EditorLayout } from "@/components/admin/editor/editor-layout";
import { EditorSection } from "@/components/admin/editor/editor-section";
import { PublishPanel } from "@/components/admin/editor/publish-panel";
import {
  hintClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/admin/editor/styles";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { PROJECT_SECTION_KEYS } from "@/lib/validation/project";
import * as mediaService from "@/server/services/media";
import * as projectService from "@/server/services/projects";

import {
  archiveProjectForm,
  ensureDraftForm,
  publishProjectForm,
  rollbackProjectForm,
  saveDraftForm,
  unarchiveProjectForm,
} from "../actions";
import { CoverImageUploader } from "./cover-image-uploader";
import { EvidencePanel } from "./evidence-panel";

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

const FORM_ID = "project-draft-form";

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
  const libraryMedia = (
    draft ? await mediaService.listMediaLibrary({ status: "READY" }) : []
  ).map((m) => ({
    id: m.id,
    filename: m.filename,
    storageUrl: m.storageUrl,
    width: m.width,
    height: m.height,
  }));

  const sectionDoc = (key: string) =>
    (draft?.sections as { key: string; content: unknown }[] | null)?.find(
      (s) => s.key === key,
    )?.content ?? null;

  return (
    <EditorLayout
      backHref="/admin/projects"
      backLabel="Projects"
      title={current.title}
      subtitle={`/work/${project.slug}`}
      aside={
        <PublishPanel
          idName="projectId"
          id={project.id}
          formId={FORM_ID}
          itemStatus={project.status}
          draft={draft}
          published={published}
          versions={versions}
          liveHref={`/work/${project.slug}`}
          ensureDraftAction={ensureDraftForm}
          publishAction={publishProjectForm}
          rollbackAction={rollbackProjectForm}
          archiveAction={archiveProjectForm}
          unarchiveAction={unarchiveProjectForm}
          noun="project"
        />
      }
    >
      {draft ? (
        <form id={FORM_ID} action={saveDraftForm} className="space-y-6">
          <input type="hidden" name="projectId" value={project.id} />

          <EditorSection
            title="Overview"
            description="How this project appears in listings."
          >
            <div>
              <label htmlFor="title" className={labelClass}>
                Title
              </label>
              <input
                id="title"
                name="title"
                defaultValue={draft.title}
                required
                className={`${inputClass} text-base`}
              />
            </div>
            <div>
              <label htmlFor="shortDescription" className={labelClass}>
                Short description
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                defaultValue={draft.shortDescription}
                required
                rows={2}
                className={textareaClass}
              />
              <p className={hintClass}>Shown on cards and as the case study lede.</p>
            </div>
            <CoverImageUploader
              initialMediaId={draft.coverMediaId}
              initialUrl={currentCoverMedia?.storageUrl ?? null}
              libraryMedia={libraryMedia}
            />
          </EditorSection>

          <EditorSection
            title="Details"
            description="Facts shown in the case study header."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className={labelClass}>
                  Category
                </label>
                <input
                  id="category"
                  name="category"
                  defaultValue={draft.category ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="year" className={labelClass}>
                  Year
                </label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  defaultValue={draft.year ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="technologies" className={labelClass}>
                Technologies
              </label>
              <input
                id="technologies"
                name="technologies"
                defaultValue={(draft.technologies ?? []).join(", ")}
                className={inputClass}
              />
              <p className={hintClass}>Comma-separated.</p>
            </div>
            <div>
              <label htmlFor="tags" className={labelClass}>
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                defaultValue={tags.map((t) => t.name).join(", ")}
                className={inputClass}
              />
              <p className={hintClass}>Comma-separated.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {(
                [
                  ["githubUrl", "GitHub", draft.githubUrl],
                  ["liveUrl", "Live URL", draft.liveUrl],
                  ["documentationUrl", "Docs URL", draft.documentationUrl],
                ] as const
              ).map(([name, label, value]) => (
                <div key={name}>
                  <label htmlFor={name} className={labelClass}>
                    {label}
                  </label>
                  <input
                    id={name}
                    name={name}
                    type="url"
                    placeholder="https://"
                    defaultValue={value ?? ""}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </EditorSection>

          <EditorSection
            title="Case study"
            description="Sections left empty are omitted from the public page."
          >
            {PROJECT_SECTION_KEYS.map((key, i) => (
              <div key={key}>
                <p className={`${labelClass} mb-1.5 flex items-baseline gap-2`}>
                  <span className="text-text-muted font-mono text-[11px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {SECTION_LABELS[key]}
                </p>
                <input
                  type="hidden"
                  name={`heading_${key}`}
                  value={SECTION_LABELS[key]}
                />
                <RichTextEditor
                  name={`section_${key}`}
                  initialContent={sectionDoc(key)}
                  label={SECTION_LABELS[key]}
                  placeholder={`Write the ${SECTION_LABELS[key].toLowerCase()}…`}
                  libraryMedia={libraryMedia}
                  minHeight="min-h-24"
                />
              </div>
            ))}
          </EditorSection>
        </form>
      ) : (
        <div className="rounded-panel border-border bg-surface border border-dashed p-8 text-center">
          <p className="text-text font-sans text-sm font-medium">This project is live.</p>
          <p className="text-text-muted mt-1 font-serif text-sm">
            Choose “Edit project” to start a new draft. The live page won&apos;t change
            until you publish.
          </p>
        </div>
      )}

      <EvidencePanel projectId={project.id} evidence={evidence} error={evidenceError} />
    </EditorLayout>
  );
}
