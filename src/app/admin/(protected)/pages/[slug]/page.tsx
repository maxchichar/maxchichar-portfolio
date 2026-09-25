import { notFound } from "next/navigation";

import { contentSchemaForSlug, PAGE_SLUGS, type PageSlug } from "@/lib/validation/page";
import * as pagesService from "@/server/services/pages";

import {
  ensureDraftForm,
  publishPageForm,
  rollbackPageForm,
  saveDraftForm,
} from "../actions";

const PAGE_LABELS: Record<PageSlug, string> = {
  home: "Home",
  about: "About",
  now: "Now",
};

function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}

const textareaClass =
  "rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-serif text-sm outline-none";
const labelClass = "text-text-muted block font-sans text-sm";

export default async function PageEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
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
  const fields = draftContent?.success ? draftContent.data : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text font-sans text-2xl font-semibold">
            {PAGE_LABELS[slug]}
          </h1>
          <p className="text-text-muted mt-1 font-mono text-xs">/{page.slug}</p>
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
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            className="rounded-card border-accent text-accent hover:bg-accent hover:text-bg border px-4 py-2 font-sans text-sm transition-colors"
          >
            Start editing (forks a new draft from the published version)
          </button>
        </form>
      )}

      {draft && fields && (
        <form action={saveDraftForm} className="mt-8 space-y-5">
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="slug" value={slug} />

          {fields.slug === "home" && (
            <>
              <div>
                <label className={labelClass}>Eyebrow</label>
                <input
                  name="heroEyebrow"
                  defaultValue={fields.heroEyebrow}
                  required
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Headline</label>
                <input
                  name="heroHeadline"
                  defaultValue={fields.heroHeadline}
                  required
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Body</label>
                <textarea
                  name="heroBody"
                  defaultValue={fields.heroBody}
                  required
                  rows={3}
                  className={textareaClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Primary CTA label</label>
                  <input
                    name="heroPrimaryCtaLabel"
                    defaultValue={fields.heroPrimaryCtaLabel}
                    required
                    className={textareaClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Primary CTA link</label>
                  <input
                    name="heroPrimaryCtaHref"
                    defaultValue={fields.heroPrimaryCtaHref}
                    required
                    className={textareaClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Secondary CTA label</label>
                  <input
                    name="heroSecondaryCtaLabel"
                    defaultValue={fields.heroSecondaryCtaLabel}
                    required
                    className={textareaClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Secondary CTA link</label>
                  <input
                    name="heroSecondaryCtaHref"
                    defaultValue={fields.heroSecondaryCtaHref}
                    required
                    className={textareaClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Current focus summary</label>
                <textarea
                  name="currentFocusSummary"
                  defaultValue={fields.currentFocusSummary}
                  required
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </>
          )}

          {fields.slug === "about" && (
            <>
              <div>
                <label className={labelClass}>Intro</label>
                <textarea
                  name="intro"
                  defaultValue={fields.intro}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Biography</label>
                <textarea
                  name="bio"
                  defaultValue={fields.bio}
                  required
                  rows={4}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>What I build</label>
                <textarea
                  name="whatIBuild"
                  defaultValue={fields.whatIBuild}
                  required
                  rows={3}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>How I think</label>
                <textarea
                  name="howIThink"
                  defaultValue={fields.howIThink}
                  required
                  rows={3}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Areas of interest</label>
                <textarea
                  name="interests"
                  defaultValue={fields.interests}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Capabilities</label>
                <textarea
                  name="capabilities"
                  defaultValue={fields.capabilities}
                  required
                  rows={3}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Current direction</label>
                <textarea
                  name="direction"
                  defaultValue={fields.direction}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </>
          )}

          {fields.slug === "now" && (
            <>
              <div>
                <label className={labelClass}>Currently building</label>
                <textarea
                  name="currentlyBuilding"
                  defaultValue={fields.currentlyBuilding}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Currently researching</label>
                <textarea
                  name="researching"
                  defaultValue={fields.researching}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Currently learning</label>
                <textarea
                  name="learning"
                  defaultValue={fields.learning}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Current interests</label>
                <textarea
                  name="interests"
                  defaultValue={fields.interests}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Current thesis</label>
                <textarea
                  name="thesis"
                  defaultValue={fields.thesis}
                  required
                  rows={3}
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Recent changes</label>
                <textarea
                  name="recentChanges"
                  defaultValue={fields.recentChanges}
                  required
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="rounded-card border-border text-text hover:border-accent border px-4 py-2.5 font-sans text-sm transition-colors"
          >
            Save draft
          </button>
        </form>
      )}

      {draft && (
        <form action={publishPageForm} className="mt-4">
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            className="rounded-card bg-accent text-bg px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
          >
            Publish this draft
          </button>
        </form>
      )}

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-text font-sans text-sm font-medium">Version history</h2>
        <div className="mt-3 space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="rounded-card border-border bg-surface flex items-center justify-between border px-4 py-2.5"
            >
              <span className="text-text-muted font-mono text-xs">
                v{v.versionNumber} · {v.status}
              </span>
              {v.status === "SUPERSEDED" && !draft && (
                <form action={rollbackPageForm}>
                  <input type="hidden" name="pageId" value={page.id} />
                  <input type="hidden" name="slug" value={slug} />
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
    </main>
  );
}
