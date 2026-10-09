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
import * as articlesService from "@/server/services/articles";
import * as mediaService from "@/server/services/media";

import {
  archiveArticleForm,
  ensureDraftForm,
  publishArticleForm,
  rollbackArticleForm,
  saveDraftForm,
  unarchiveArticleForm,
} from "../actions";
import { CoverImageUploader } from "./cover-image-uploader";

const FORM_ID = "article-draft-form";

export default async function ArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await articlesService.getArticleFullState(id);
  if (!state) notFound();

  const { article, draft, published, versions, tags } = state;
  const current = draft ?? published;
  if (!current) notFound();

  const currentCoverMedia = draft?.coverMediaId
    ? await articlesService.getMediaById(draft.coverMediaId)
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
          liveHref={`/writing/${article.slug}`}
          ensureDraftAction={ensureDraftForm}
          publishAction={publishArticleForm}
          rollbackAction={rollbackArticleForm}
          archiveAction={archiveArticleForm}
          unarchiveAction={unarchiveArticleForm}
          noun="article"
        />
      }
    >
      {draft ? (
        <form id={FORM_ID} action={saveDraftForm} className="space-y-6">
          <input type="hidden" name="articleId" value={article.id} />

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
            <div>
              <label htmlFor="excerpt" className={labelClass}>
                Excerpt
              </label>
              <textarea
                id="excerpt"
                name="excerpt"
                defaultValue={draft.excerpt}
                required
                rows={2}
                className={textareaClass}
              />
              <p className={hintClass}>Shown in listings and as the article lede.</p>
            </div>
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
            </div>
          </EditorSection>

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
            <CoverImageUploader
              initialMediaId={draft.coverMediaId}
              initialUrl={currentCoverMedia?.storageUrl ?? null}
              libraryMedia={libraryMedia}
            />
          </EditorSection>
        </form>
      ) : (
        <div className="rounded-panel border-border bg-surface border border-dashed p-8 text-center">
          <p className="text-text font-sans text-sm font-medium">This article is live.</p>
          <p className="text-text-muted mt-1 font-serif text-sm">
            Choose “Edit article” to start a new draft. The live page won&apos;t change
            until you publish.
          </p>
        </div>
      )}
    </EditorLayout>
  );
}
