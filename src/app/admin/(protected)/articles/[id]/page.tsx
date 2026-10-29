import { notFound } from "next/navigation";

import { resolveCanonicalUrl } from "@/lib/metadata";
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
import { ImageField } from "@/components/admin/image-field";
import * as articlesService from "@/server/services/articles";
import * as aiService from "@/server/services/ai";
import * as mediaService from "@/server/services/media";

import {
  archiveArticleForm,
  deleteArticleForm,
  ensureDraftForm,
  fixFormattingForm,
  publishArticleForm,
  previewArticleForm,
  rollbackArticleForm,
  saveDraftForm,
  unarchiveArticleForm,
} from "../actions";
import { ExcerptField } from "./excerpt-field";
import { WritingAssistant } from "./writing-assistant";

const FORM_ID = "article-draft-form";

export default async function ArticleEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fixed?: string; error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const state = await articlesService.getArticleFullState(id);
  if (!state) notFound();

  const { article, draft, published, versions, tags } = state;
  const current = draft ?? published;
  if (!current) notFound();
  const needsFix = articlesService.needsFormattingFix(current);
  const justFixed = query.fixed === "1" && Boolean(draft) && !needsFix;

  // The draft's cover while editing; the live version's cover otherwise.
  const coverMediaId = draft ? draft.coverMediaId : (published?.coverMediaId ?? null);
  const currentCoverMedia = coverMediaId
    ? await articlesService.getMediaById(coverMediaId)
    : null;

  // Same existing service /admin/media itself uses — no new query.
  const libraryMedia = (
    draft ? await mediaService.listMediaLibrary({ status: "READY", kind: "image" }) : []
  ).map((m) => ({
    id: m.id,
    filename: m.filename,
    storageUrl: m.storageUrl,
    width: m.width,
    height: m.height,
  }));

  return (
    <EditorLayout
      backHref="/admin/articles"
      backLabel="Writing"
      title={current.title}
      subtitle={`/writing/${article.slug}${
        current.readingTime ? ` · ${current.readingTime} min read` : ""
      }`}
      aside={
        <PublishPanel
          idName="articleId"
          id={article.id}
          formId={FORM_ID}
          itemStatus={article.status}
          draft={draft}
          published={published}
          versions={versions}
          liveHref={resolveCanonicalUrl(`/writing/${article.slug}`)}
          previewHref={`/preview/writing/${article.id}`}
          ensureDraftAction={ensureDraftForm}
          publishAction={publishArticleForm}
          publishFromDraftForm
          saveAndPreviewAction={previewArticleForm}
          rollbackAction={rollbackArticleForm}
          archiveAction={archiveArticleForm}
          unarchiveAction={unarchiveArticleForm}
          deleteAction={deleteArticleForm}
          noun="article"
        />
      }
    >
      {query.error ? (
        <p
          role="alert"
          className="rounded-panel border-border text-text mb-6 border p-5 font-sans text-sm"
        >
          {query.error}
        </p>
      ) : null}
      {draft?.source?.startsWith("content-api:") ? (
        <p
          role="status"
          className="rounded-panel border-border bg-surface text-text mb-6 border p-5 font-sans text-sm"
        >
          This draft was {draft.generationMode === "AI_GENERATED" ? "written" : "edited"}{" "}
          through the Content API by{" "}
          <strong>{draft.source.slice("content-api:".length)}</strong>. Review it before
          you publish.
        </p>
      ) : null}
      {needsFix ? (
        <form
          action={fixFormattingForm}
          role="alert"
          className="rounded-panel border-accent/40 bg-accent/5 mb-6 flex flex-col gap-4 border p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <input type="hidden" name="articleId" value={article.id} />
          <div>
            <p className="text-text font-sans text-sm font-semibold">
              This article&apos;s formatting needs fixing
            </p>
            <p className="text-text-muted mt-1 font-sans text-xs">
              Its text is in the excerpt, or written as raw Markdown (#, **, ---). One
              click moves it into the body with proper headings, emphasis and lists, and
              writes a short excerpt. You can review it before publishing.
            </p>
          </div>
          <button
            type="submit"
            className="bg-text text-bg hover:bg-accent shrink-0 rounded-full px-5 py-2.5 font-sans text-sm font-medium transition-colors"
          >
            Fix formatting
          </button>
        </form>
      ) : justFixed ? (
        <p
          role="status"
          className="rounded-panel border-border bg-surface text-text mb-6 border p-5 font-sans text-sm"
        >
          Formatting fixed in this draft. Check the excerpt and body below, add a cover
          image if you like, then choose <strong>Publish changes</strong>.
        </p>
      ) : null}

      {draft ? (
        <form id={FORM_ID} action={saveDraftForm} className="space-y-6">
          <input type="hidden" name="articleId" value={article.id} />

          <EditorSection
            title="Cover image"
            description="Shown at the top of the article, in the Writing list and on share cards."
          >
            <ImageField
              name="coverMediaId"
              label="Image"
              hint="JPEG, PNG or WebP, up to 8 MB. Landscape images at least 1600 px wide look best."
              initialMediaId={draft.coverMediaId}
              initialUrl={currentCoverMedia?.storageUrl ?? null}
              libraryMedia={libraryMedia}
            />
          </EditorSection>

          <EditorSection title="Article">
            <div>
              <label htmlFor="title" className={labelClass}>
                Title
              </label>
              <input
                id="title"
                name="title"
                defaultValue={draft.title}
                required
                className={`${inputClass} text-lg font-semibold`}
              />
            </div>
            <ExcerptField
              defaultValue={draft.excerpt}
              className={textareaClass}
              hintClassName={hintClass}
            />
            <div>
              <p className={`${labelClass} mb-1.5`}>Body</p>
              <RichTextEditor
                name="content"
                initialContent={draft.content}
                label="Article body"
                placeholder="Start writing…"
                libraryMedia={libraryMedia}
                minHeight="min-h-[28rem]"
              />
              <p className={hintClass}>
                Use the toolbar for headings, bold, lists and images, or paste Markdown (#
                Heading, **bold**, - list, ---) and it&apos;s formatted for you.
              </p>
            </div>
          </EditorSection>

          {aiService.isAiConfigured() ? (
            <EditorSection
              title="Writing assistant"
              description="Suggestions from Claude, based on the draft on screen. Nothing changes until you choose Use, and you still save and publish yourself."
            >
              <WritingAssistant articleId={article.id} formId={FORM_ID} />
            </EditorSection>
          ) : null}

          <EditorSection title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className={labelClass}>
                  Category
                </label>
                <input
                  id="category"
                  name="category"
                  defaultValue={draft.category ?? ""}
                  placeholder="Essay, Note…"
                  className={inputClass}
                />
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
            </div>
          </EditorSection>
        </form>
      ) : (
        <div className="rounded-panel border-border bg-surface border border-dashed p-8 text-center">
          {currentCoverMedia ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentCoverMedia.storageUrl}
              alt="Current cover image"
              className="rounded-card border-border mx-auto mb-5 aspect-[16/9] w-full max-w-md border object-cover"
            />
          ) : null}
          <p className="text-text font-sans text-sm font-medium">This article is live.</p>
          <p className="text-text-muted mt-1 font-serif text-sm">
            Choose “Edit article” to start a new draft, including a new cover image. The
            live page won&apos;t change until you publish.
          </p>
        </div>
      )}
    </EditorLayout>
  );
}
