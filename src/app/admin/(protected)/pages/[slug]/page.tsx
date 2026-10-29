import { notFound } from "next/navigation";

import { EditorLayout } from "@/components/admin/editor/editor-layout";
import { EditorSection } from "@/components/admin/editor/editor-section";
import { PublishPanel } from "@/components/admin/editor/publish-panel";
import { TextField } from "@/components/admin/editor/text-field";
import { resolveCanonicalUrl } from "@/lib/metadata";
import { contentSchemaForSlug, PAGE_SLUGS, type PageSlug } from "@/lib/validation/page";
import * as pagesService from "@/server/services/pages";

import {
  ensureDraftForm,
  previewPageForm,
  publishPageForm,
  rollbackPageForm,
  saveDraftForm,
} from "../actions";
import { fieldMaxLength, PAGE_SECTIONS } from "../fields";

const PAGE_LABELS: Record<PageSlug, string> = {
  home: "Home",
  about: "About",
  now: "Now",
};

const FORM_ID = "page-draft-form";

function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}

const noticeClass =
  "rounded-panel border-border bg-surface text-text border p-5 font-sans text-sm";

export default async function PageEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; saved?: string; published?: string }>;
}) {
  const [{ slug: rawSlug }, query] = await Promise.all([params, searchParams]);
  if (!isPageSlug(rawSlug)) notFound();
  const slug = rawSlug;

  const page = await pagesService.getPageBySlug(slug);
  if (!page) notFound();

  const state = await pagesService.getPageFullState(page.id);
  if (!state) notFound();

  const { draft, published, versions } = state;
  if (!draft && !published) notFound(); // no version yet — run `npm run seed:pages`

  // Draft content is stored as jsonb (untyped at the DB level) — parse it
  // back through the same per-slug schema used to write it, rather than
  // trusting the shape blindly, before handing field values to the form.
  const draftContent = draft ? contentSchemaForSlug(slug).safeParse(draft.content) : null;
  const fields = draftContent?.success
    ? (draftContent.data as unknown as Record<string, string>)
    : null;

  const path = slug === "home" ? "/" : `/${slug}`;
  const label = PAGE_LABELS[slug];

  return (
    <EditorLayout
      backHref="/admin/pages"
      backLabel="Pages"
      title={label}
      subtitle={path}
      aside={
        <PublishPanel
          idName="pageId"
          id={page.id}
          formId={FORM_ID}
          itemStatus="ACTIVE"
          draft={draft}
          published={published}
          versions={versions.map((v) => ({ ...v, title: `${label} page` }))}
          liveHref={resolveCanonicalUrl(path)}
          ensureDraftAction={ensureDraftForm}
          publishAction={publishPageForm}
          publishFromDraftForm
          saveAndPreviewAction={previewPageForm}
          rollbackAction={rollbackPageForm}
          noun="page"
        />
      }
    >
      {query.error ? (
        <p role="alert" className={`${noticeClass} border-accent/40`}>
          {query.error}
        </p>
      ) : query.published ? (
        <p role="status" className={noticeClass}>
          Published. The live {label} page now shows this version.
        </p>
      ) : query.saved ? (
        <p role="status" className={noticeClass}>
          Draft saved. Visitors still see the published version until you publish.
        </p>
      ) : null}

      {!draft ? (
        <p className={noticeClass}>
          This page is showing its published version. Choose <strong>Edit page</strong> to
          start a draft; the live page stays unchanged until you publish.
        </p>
      ) : !fields ? (
        <p role="alert" className={noticeClass}>
          This draft&apos;s saved content doesn&apos;t match the {label} page&apos;s
          fields, so it can&apos;t be edited here. Restore a previous version from
          History.
        </p>
      ) : (
        // Keyed by the saved content so the fields reset to what's stored
        // after a save or restore, rather than keeping stale typed text.
        <form
          key={`${draft.id}:${JSON.stringify(fields)}`}
          id={FORM_ID}
          action={saveDraftForm}
          className="space-y-6"
        >
          <input type="hidden" name="pageId" value={page.id} />
          {PAGE_SECTIONS[slug].map((section) => (
            <EditorSection
              key={section.title}
              title={section.title}
              description={section.description}
            >
              {section.fields.map((field) => (
                <TextField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  hint={field.hint}
                  defaultValue={fields[field.name] ?? ""}
                  maxLength={fieldMaxLength(slug, field.name)}
                  multiline={!field.short}
                  minRows={field.rows}
                />
              ))}
            </EditorSection>
          ))}
        </form>
      )}
    </EditorLayout>
  );
}
