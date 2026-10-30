"use client";

import { useActionState, useEffect, useState } from "react";

import { EditorSection } from "@/components/admin/editor/editor-section";
import {
  hintClass,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/admin/editor/styles";
import { ImageField } from "@/components/admin/image-field";
import type { MediaPickerItem } from "@/components/admin/media-picker";
import { withScheme } from "@/lib/social-url";
import {
  DEFAULT_SITE_SETTINGS,
  type PublicSiteSettings,
} from "@/lib/validation/settings";

import {
  saveSettingsForm,
  saveSiteDocument,
  saveSiteImage,
  type SettingsFormState,
} from "./actions";

const initialState: SettingsFormState = {
  success: false,
};

// The text settings saved by the main form (images and documents save on
// their own, as soon as they're picked).
const TEXT_KEYS = [
  "siteName",
  "siteDescription",
  "primaryEmail",
  "socialGithub",
  "socialX",
  "socialLinkedin",
  "socialYoutube",
  "socialInstagram",
  "socialTiktok",
  "footerText",
] as const;
type TextKey = (typeof TEXT_KEYS)[number];
type TextValues = Record<TextKey, string>;

function textValues(settings: PublicSiteSettings): TextValues {
  return Object.fromEntries(
    TEXT_KEYS.map((key) => [key, settings[key] ?? ""]),
  ) as TextValues;
}

const SOCIALS = [
  { key: "socialGithub", label: "GitHub", placeholder: "https://github.com/…" },
  { key: "socialX", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "socialLinkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { key: "socialYoutube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { key: "socialInstagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "socialTiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
] as const satisfies readonly { key: TextKey; label: string; placeholder: string }[];

// Same rule as the schema's safeSocialUrlSchema, checked before submitting.
const URL_PATTERN = "https?://\\S+";
const URL_MESSAGE = "Use a full link starting with https://";

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  maxLength,
  multiline = false,
  required = false,
  ...input
}: {
  id: TextKey;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
  required?: boolean;
  type?: string;
  placeholder?: string;
  pattern?: string;
  onBlur?: () => void;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const near = value.length > maxLength * 0.9;
  const shared = {
    id,
    name: id,
    value,
    required,
    maxLength,
    "aria-describedby": hintId,
  };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className={labelClass}>
          {label}
          {required ? <span className="text-accent"> *</span> : null}
        </label>
        {multiline || maxLength <= 100 ? (
          <span
            className={`font-mono text-[11px] tabular-nums ${near ? "text-accent font-semibold" : "text-text-muted"}`}
          >
            {value.length} / {maxLength}
          </span>
        ) : null}
      </div>
      {multiline ? (
        <textarea
          {...shared}
          rows={2}
          placeholder={input.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={textareaClass}
        />
      ) : (
        <input
          {...shared}
          type={input.type ?? "text"}
          placeholder={input.placeholder}
          pattern={input.pattern}
          title={input.pattern ? URL_MESSAGE : undefined}
          onBlur={input.onBlur}
          onChange={(e) => {
            e.currentTarget.setCustomValidity("");
            onChange(e.target.value);
          }}
          onInvalid={(e) => {
            if (input.pattern && e.currentTarget.validity.patternMismatch) {
              e.currentTarget.setCustomValidity(URL_MESSAGE);
            }
          }}
          className={inputClass}
        />
      )}
      {hint ? (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsForm({
  initialSettings,
  initialAvatar,
  libraryMedia,
  children,
}: {
  initialSettings: PublicSiteSettings;
  initialAvatar: { mediaId: string; url: string } | null;
  libraryMedia: MediaPickerItem[];
  /** Extra sections for the main column (the CV), which save on their own. */
  children?: React.ReactNode;
}) {
  // Controlled text survives React action resets, including validation failures
  // and independent image/document saves that refresh server props.
  const [values, setValues] = useState(() => textValues(initialSettings));
  // What's stored, to tell whether the form has unsaved edits.
  const [saved, setSaved] = useState(values);
  const [state, formAction, isPending] = useActionState(
    async (previous: SettingsFormState, formData: FormData) => {
      const result = await saveSettingsForm(previous, formData);
      if (result.success) {
        setSaved(
          Object.fromEntries(
            TEXT_KEYS.map((key) => [key, String(formData.get(key) ?? "")]),
          ) as TextValues,
        );
      }
      return result;
    },
    initialState,
  );

  const dirty = TEXT_KEYS.some((key) => values[key].trim() !== saved[key].trim());
  const set = (key: TextKey) => (value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // What the public footer will show once saved (a blank tagline falls back
  // to the default, as the site does).
  const name = values.siteName.trim() || DEFAULT_SITE_SETTINGS.siteName;
  const tagline = values.siteDescription.trim() || DEFAULT_SITE_SETTINGS.siteDescription;
  const socials = SOCIALS.filter(({ key }) => values[key].trim().length > 0);
  const statusText = isPending
    ? "Saving…"
    : dirty
      ? "Unsaved changes"
      : state.success
        ? "Saved. The site is up to date."
        : "No unsaved changes";
  const statusDot = (
    <span
      aria-hidden="true"
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dirty ? "bg-accent animate-pulse" : "bg-text-muted/50"}`}
    />
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 pb-24 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-0"
    >
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <EditorSection
          title="Identity"
          description="How the site names and describes you. Text changes go live when you save."
        >
          <Field
            id="siteName"
            label="Site name"
            hint="The wordmark in the navigation and footer, the line under the homepage hero, the About page heading, and your name in search data."
            value={values.siteName}
            onChange={set("siteName")}
            maxLength={100}
            required
          />
          <Field
            id="siteDescription"
            label="Tagline"
            hint={`Shown after your name in the footer, on the admin sign-in page and in search data. Leave blank to use the default: “${DEFAULT_SITE_SETTINGS.siteDescription}”.`}
            value={values.siteDescription}
            onChange={set("siteDescription")}
            maxLength={300}
            multiline
            placeholder={DEFAULT_SITE_SETTINGS.siteDescription}
          />
          <Field
            id="primaryEmail"
            label="Public email"
            hint="Linked in the footer and the search menu. Contact-form messages and error alerts are sent here too, unless a notification address is set on the server."
            value={values.primaryEmail}
            onChange={set("primaryEmail")}
            maxLength={255}
            type="email"
            placeholder="hello@example.com"
          />
        </EditorSection>

        <EditorSection
          title="Imagery"
          description="Photos used across the public site. JPEG, PNG or WebP. Images save and go live as soon as you choose them."
        >
          <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
            <ImageField
              name="heroMediaId"
              label="Homepage hero"
              hint="Landscape photo, ideally 2400px wide or more (16:9 or wider)."
              initialMediaId={initialSettings.heroImage?.mediaId ?? null}
              initialUrl={initialSettings.heroImage?.url ?? null}
              libraryMedia={libraryMedia}
              aspect="aspect-[16/9]"
              onCommit={(id) => saveSiteImage("heroMediaId", id)}
            />
            <ImageField
              name="aboutMediaId"
              label="About page portrait"
              hint="Portrait photo (4:5) shown beside your About intro."
              initialMediaId={initialSettings.aboutImage?.mediaId ?? null}
              initialUrl={initialSettings.aboutImage?.url ?? null}
              libraryMedia={libraryMedia}
              aspect="aspect-[4/5]"
              onCommit={(id) => saveSiteImage("aboutMediaId", id)}
            />
          </div>

          <div className="max-w-[16rem]">
            <ImageField
              name="avatarMediaId"
              label="Profile photo"
              hint="Square photo of you, shown as the author on your articles. Without one, the About portrait is used."
              initialMediaId={initialAvatar?.mediaId ?? null}
              initialUrl={initialAvatar?.url ?? null}
              libraryMedia={libraryMedia}
              aspect="aspect-square"
              onCommit={(id) => saveSiteDocument("avatar", id)}
            />
          </div>
        </EditorSection>

        {children}

        <EditorSection
          title="Social profiles"
          description="Listed under “Elsewhere” in the footer and in search data. The X and Instagram links also hide in the X and I of the big footer wordmark. Leave blank to omit."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {SOCIALS.map(({ key, label, placeholder }) => (
              <Field
                key={key}
                id={key}
                label={label}
                value={values[key]}
                onChange={set(key)}
                onBlur={() => set(key)(withScheme(values[key]))}
                maxLength={255}
                type="url"
                pattern={URL_PATTERN}
                placeholder={placeholder}
              />
            ))}
          </div>
        </EditorSection>

        <EditorSection title="Footer">
          <Field
            id="footerText"
            label="Footer note (optional)"
            hint="A short line at the bottom right of every page, beside the RSS link."
            value={values.footerText}
            onChange={set("footerText")}
            maxLength={300}
            multiline
            placeholder="e.g. Built in Lagos."
          />
        </EditorSection>
      </div>

      <aside className="min-w-0">
        <div className="space-y-4 lg:sticky lg:top-6">
          {/* Phones use the fixed save bar below instead. */}
          <section className="rounded-panel border-border bg-surface hidden border p-5 lg:block">
            <h2 className="text-text font-sans text-sm font-semibold">Save</h2>
            <p
              role="status"
              className="text-text-muted mt-3 flex items-center gap-2 font-sans text-xs"
            >
              {statusDot}
              {statusText}
            </p>
            {state.error ? (
              <p role="alert" className="text-accent mt-2 font-sans text-xs">
                {state.error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-card bg-accent text-bg mt-4 w-full px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save settings"}
            </button>
            <p className="text-text-muted mt-3 font-sans text-xs">
              Images and the CV save on their own as soon as you choose them.
            </p>
          </section>

          <section
            aria-label="Footer preview"
            className="rounded-panel border-border bg-surface border p-4 sm:p-5"
          >
            <h2 className="text-text font-sans text-sm font-semibold">Footer preview</h2>
            <div className="border-border bg-bg rounded-card mt-4 space-y-3 border p-4">
              {values.primaryEmail.trim() ? (
                <p className="text-text-muted truncate font-sans text-xs">
                  {values.primaryEmail.trim()}
                </p>
              ) : null}
              {socials.length > 0 ? (
                <p className="text-text font-sans text-xs [overflow-wrap:anywhere]">
                  {socials.map(({ label }) => label).join(" · ")}
                </p>
              ) : null}
              <p className="text-text-muted border-border border-t pt-3 font-mono text-[11px] leading-relaxed [overflow-wrap:anywhere]">
                &copy; {new Date().getFullYear()} {name}. {tagline}
              </p>
              {values.footerText.trim() ? (
                <p className="text-text-muted font-mono text-[11px] [overflow-wrap:anywhere]">
                  {values.footerText.trim()}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </aside>

      <div className="border-border bg-bg/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {state.error ? (
          <p role="alert" className="text-accent mb-2 font-sans text-xs">
            {state.error}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <p className="text-text-muted flex min-w-0 flex-1 items-center gap-2 font-sans text-xs">
            {statusDot}
            <span className="truncate">
              {isPending
                ? "Saving…"
                : dirty
                  ? "Unsaved changes"
                  : state.success
                    ? "Saved"
                    : "Up to date"}
            </span>
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-card bg-accent text-bg shrink-0 px-5 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </form>
  );
}
