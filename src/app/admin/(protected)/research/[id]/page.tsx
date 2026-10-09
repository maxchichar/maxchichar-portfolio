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
import { RESEARCH_SECTION_KEYS, RESEARCH_TYPES } from "@/lib/validation/research";
import * as mediaService from "@/server/services/media";
import * as researchService from "@/server/services/research";

import {
  archiveResearchForm,
  ensureDraftForm,
  publishResearchForm,
  rollbackResearchForm,
  saveDraftForm,
  unarchiveResearchForm,
} from "../actions";
import { CoverImageUploader } from "./cover-image-uploader";
import { EvidencePanel } from "./evidence-panel";

const SECTION_LABELS: Record<(typeof RESEARCH_SECTION_KEYS)[number], string> = {
  research_question: "Research Question",
  background: "Background",
  methodology: "Methodology",
  // Labeled "Evidence" in the UI even though the stored key is
  // evidence_narrative — see the naming note in validation/research.ts.
  evidence_narrative: "Evidence",
  findings: "Findings",
  counterarguments: "Counterarguments",
  limitations: "Limitations",
  conclusion: "Conclusion",
  sources: "Sources",
};

const FORM_ID = "research-draft-form";

export default async function ResearchEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ evidenceError?: string }>;
}) {
  const { id } = await params;
  const { evidenceError } = await searchParams;
  const state = await researchService.getResearchFullState(id);
  if (!state) notFound();

  const { research, draft, published, versions, evidence, tags } = state;
  const current = draft ?? published;
  if (!current) notFound();

  const currentCoverMedia = draft?.coverMediaId
    ? await researchService.getMediaById(draft.coverMediaId)
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
      backHref="/admin/research"
      backLabel="Research"
      title={current.title}
      subtitle={`/research/${research.slug}`}
      aside={
        <PublishPanel
          idName="researchId"
          id={research.id}
          formId={FORM_ID}
          itemStatus={research.status}
          draft={draft}
          published={published}
          versions={versions}
          liveHref={`/research/${research.slug}`}
          ensureDraftAction={ensureDraftForm}
          publishAction={publishResearchForm}
          rollbackAction={rollbackResearchForm}
          archiveAction={archiveResearchForm}
          unarchiveAction={unarchiveResearchForm}
          noun="research"
        />
      }
    >
      {draft ? (
        <form id={FORM_ID} action={saveDraftForm} className="space-y-6">
          <input type="hidden" name="researchId" value={research.id} />

          <EditorSection
            title="Overview"
            description="How this research appears in the index."
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
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="type" className={labelClass}>
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue={draft.type}
                  required
                  className={inputClass}
                >
                  {RESEARCH_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="category" className={labelClass}>
                  Field
                </label>
                <input
                  id="category"
                  name="category"
                  defaultValue={draft.category ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="abstract" className={labelClass}>
                Abstract
              </label>
              <textarea
                id="abstract"
                name="abstract"
                defaultValue={draft.abstract}
                required
                rows={3}
                className={textareaClass}
              />
            </div>
            <CoverImageUploader
              initialMediaId={draft.coverMediaId}
              initialUrl={currentCoverMedia?.storageUrl ?? null}
              libraryMedia={libraryMedia}
            />
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
          </EditorSection>

          <EditorSection
            title="Write-up"
            description="Sections left empty are omitted from the public page."
          >
            {RESEARCH_SECTION_KEYS.map((key, i) => (
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
          <p className="text-text font-sans text-sm font-medium">
            This research is live.
          </p>
          <p className="text-text-muted mt-1 font-serif text-sm">
            Choose “Edit research” to start a new draft. The live page won&apos;t change
            until you publish.
          </p>
        </div>
      )}

      <EvidencePanel researchId={research.id} evidence={evidence} error={evidenceError} />
    </EditorLayout>
  );
}
