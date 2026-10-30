"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ImageField } from "@/components/admin/image-field";
import type { MediaPickerItem } from "@/components/admin/media-picker";

import { saveTestimonialForm, type TestimonialFormState } from "./actions";

const inputClass =
  "rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-base outline-none sm:text-sm";
const labelClass = "text-text-muted block font-sans text-sm";
const QUOTE_MAX = 800;

export interface TestimonialFormValues {
  id: string | null;
  quote: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  authorUrl: string;
  avatarMediaId: string | null;
  avatarUrl: string | null;
  projectId: string;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
}

export function TestimonialForm({
  initial,
  projects,
  libraryMedia,
}: {
  initial: TestimonialFormValues;
  projects: { id: string; title: string }[];
  libraryMedia: MediaPickerItem[];
}) {
  const [state, formAction, pending] = useActionState<TestimonialFormState, FormData>(
    saveTestimonialForm,
    {},
  );
  // After a failed save React resets the form, so the fields refill from
  // what was submitted rather than from the original values.
  const v = { ...initial, ...state.values };
  const [quoteLength, setQuoteLength] = useState(initial.quote.length);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="id" value={initial.id ?? ""} />

      <section className="rounded-panel border-border bg-surface space-y-5 border p-4 sm:p-6">
        <h2 className="text-text font-sans text-base font-semibold">Quote</h2>
        <div>
          <label htmlFor="t-quote" className={labelClass}>
            What they said
          </label>
          <textarea
            id="t-quote"
            name="quote"
            required
            minLength={10}
            maxLength={QUOTE_MAX}
            rows={5}
            defaultValue={v.quote}
            onChange={(e) => setQuoteLength(e.target.value.length)}
            className={`${inputClass} font-serif text-base leading-relaxed`}
            placeholder="Their words, as they said them. Short and specific beats long and general."
          />
          <p className="text-text-muted mt-1 text-right font-mono text-[11px]">
            {quoteLength}/{QUOTE_MAX}
          </p>
        </div>
      </section>

      <section className="rounded-panel border-border bg-surface space-y-5 border p-4 sm:p-6">
        <h2 className="text-text font-sans text-base font-semibold">Who said it</h2>
        <div className="grid gap-6 md:grid-cols-[1fr_200px]">
          <div className="space-y-5">
            <div>
              <label htmlFor="t-name" className={labelClass}>
                Name
              </label>
              <input
                id="t-name"
                name="authorName"
                required
                maxLength={100}
                defaultValue={v.authorName}
                className={inputClass}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="t-role" className={labelClass}>
                  Role <span className="opacity-70">(optional)</span>
                </label>
                <input
                  id="t-role"
                  name="authorRole"
                  maxLength={100}
                  defaultValue={v.authorRole}
                  placeholder="CTO"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="t-company" className={labelClass}>
                  Company <span className="opacity-70">(optional)</span>
                </label>
                <input
                  id="t-company"
                  name="authorCompany"
                  maxLength={100}
                  defaultValue={v.authorCompany}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="t-url" className={labelClass}>
                Link <span className="opacity-70">(optional, e.g. their LinkedIn)</span>
              </label>
              <input
                id="t-url"
                name="authorUrl"
                type="url"
                maxLength={255}
                defaultValue={v.authorUrl}
                placeholder="https://"
                className={inputClass}
              />
            </div>
          </div>
          <div className="max-w-[220px] md:max-w-none">
            <ImageField
              name="avatarMediaId"
              label="Photo"
              hint="Optional. Square works best."
              initialMediaId={initial.avatarMediaId}
              initialUrl={initial.avatarUrl}
              libraryMedia={libraryMedia}
              aspect="aspect-square"
            />
          </div>
        </div>
      </section>

      <section className="rounded-panel border-border bg-surface space-y-5 border p-4 sm:p-6">
        <h2 className="text-text font-sans text-base font-semibold">Where it appears</h2>
        <div>
          <label htmlFor="t-project" className={labelClass}>
            Project <span className="opacity-70">(shows on that case study)</span>
          </label>
          <select
            id="t-project"
            name="projectId"
            defaultValue={v.projectId}
            className={inputClass}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
          <label className="text-text flex cursor-pointer items-center gap-3 py-2 font-sans text-sm sm:py-0">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={v.featured}
              className="accent-accent h-5 w-5 sm:h-4 sm:w-4"
            />
            Feature on the homepage
          </label>
          <label className="text-text flex cursor-pointer items-center gap-3 py-2 font-sans text-sm sm:py-0">
            <input
              type="checkbox"
              name="visible"
              defaultChecked={v.visible}
              className="accent-accent h-5 w-5 sm:h-4 sm:w-4"
            />
            Visible on the site
          </label>
        </div>
        <div className="max-w-[160px]">
          <label htmlFor="t-order" className={labelClass}>
            Order <span className="opacity-70">(lowest first)</span>
          </label>
          <input
            id="t-order"
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={v.sortOrder}
            className={inputClass}
          />
        </div>
      </section>

      {state.error ? (
        <p
          role="alert"
          className="rounded-card border-border bg-surface text-text border px-4 py-3 font-sans text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-card bg-accent text-bg w-full px-5 py-3 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:py-2.5"
        >
          {pending ? "Saving…" : initial.id ? "Save changes" : "Add testimonial"}
        </button>
        <Link
          href="/admin/testimonials"
          className="text-text-muted hover:text-text py-2 text-center font-sans text-sm"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
