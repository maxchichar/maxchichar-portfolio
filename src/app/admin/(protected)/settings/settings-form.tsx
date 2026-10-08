"use client";

import { useActionState } from "react";

import { ImageField } from "@/components/admin/image-field";
import type { MediaPickerItem } from "@/components/admin/media-picker";
import type { PublicSiteSettings } from "@/lib/validation/settings";

import { saveSettingsForm, type SettingsFormState } from "./actions";

const inputClass =
  "rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none";
const textareaClass =
  "rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-serif text-sm outline-none";
const labelClass = "text-text-muted block font-sans text-sm";

const initialState: SettingsFormState = {
  success: false,
};

export function SettingsForm({
  initialSettings,
  libraryMedia,
}: {
  initialSettings: PublicSiteSettings;
  libraryMedia: MediaPickerItem[];
}) {
  const [state, formAction, isPending] = useActionState(saveSettingsForm, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <section className="rounded-panel border-border bg-surface space-y-6 border p-6">
        <div>
          <h2 className="text-text font-sans text-base font-semibold">Imagery</h2>
          <p className="text-text-muted mt-1 font-serif text-xs">
            Photos used across the public site. JPEG, PNG or WebP from the media library.
            Changes go live when you save.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
          <ImageField
            name="heroMediaId"
            label="Homepage hero"
            hint="Landscape photo, ideally 2400px wide or more (16:9 or wider)."
            initialMediaId={initialSettings.heroImage?.mediaId ?? null}
            initialUrl={initialSettings.heroImage?.url ?? null}
            libraryMedia={libraryMedia}
            aspect="aspect-[16/9]"
          />
          <ImageField
            name="aboutMediaId"
            label="About page portrait"
            hint="Portrait photo (4:5) shown beside your About intro."
            initialMediaId={initialSettings.aboutImage?.mediaId ?? null}
            initialUrl={initialSettings.aboutImage?.url ?? null}
            libraryMedia={libraryMedia}
            aspect="aspect-[4/5]"
          />
        </div>
      </section>

      <section className="rounded-panel border-border bg-surface space-y-6 border p-6">
        <h2 className="text-text font-sans text-base font-semibold">Branding</h2>

        <div>
          <label htmlFor="siteName" className={labelClass}>
            Site Name <span className="text-accent">*</span>
          </label>
          <input
            id="siteName"
            name="siteName"
            type="text"
            required
            maxLength={100}
            defaultValue={initialSettings.siteName}
            className={inputClass}
          />
          <p className="text-text-muted mt-1 font-sans text-xs">
            Appears as the wordmark in navigation and footer.
          </p>
        </div>

        <div>
          <label htmlFor="siteDescription" className={labelClass}>
            Positioning Statement / Tagline
          </label>
          <textarea
            id="siteDescription"
            name="siteDescription"
            rows={2}
            maxLength={300}
            defaultValue={initialSettings.siteDescription ?? ""}
            className={textareaClass}
          />
          <p className="text-text-muted mt-1 font-sans text-xs">
            Appears below the wordmark in the footer.
          </p>
        </div>

        <div>
          <label htmlFor="primaryEmail" className={labelClass}>
            Primary Email
          </label>
          <input
            id="primaryEmail"
            name="primaryEmail"
            type="email"
            maxLength={255}
            defaultValue={initialSettings.primaryEmail ?? ""}
            placeholder="e.g. hello@example.com"
            className={inputClass}
          />
        </div>
      </section>

      <section className="rounded-panel border-border bg-surface space-y-6 border p-6">
        <h2 className="text-text font-sans text-base font-semibold">Social Profiles</h2>
        <p className="text-text-muted font-serif text-xs">
          Configured profiles are rendered as links in the footer. Leave blank to omit.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="socialGithub" className={labelClass}>
              GitHub URL
            </label>
            <input
              id="socialGithub"
              name="socialGithub"
              type="url"
              maxLength={255}
              defaultValue={initialSettings.socialGithub ?? ""}
              placeholder="https://github.com/..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="socialX" className={labelClass}>
              X (Twitter) URL
            </label>
            <input
              id="socialX"
              name="socialX"
              type="url"
              maxLength={255}
              defaultValue={initialSettings.socialX ?? ""}
              placeholder="https://x.com/..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="socialLinkedin" className={labelClass}>
              LinkedIn URL
            </label>
            <input
              id="socialLinkedin"
              name="socialLinkedin"
              type="url"
              maxLength={255}
              defaultValue={initialSettings.socialLinkedin ?? ""}
              placeholder="https://linkedin.com/in/..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="socialYoutube" className={labelClass}>
              YouTube URL
            </label>
            <input
              id="socialYoutube"
              name="socialYoutube"
              type="url"
              maxLength={255}
              defaultValue={initialSettings.socialYoutube ?? ""}
              placeholder="https://youtube.com/@..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="socialInstagram" className={labelClass}>
              Instagram URL
            </label>
            <input
              id="socialInstagram"
              name="socialInstagram"
              type="url"
              maxLength={255}
              defaultValue={initialSettings.socialInstagram ?? ""}
              placeholder="https://instagram.com/..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="socialTiktok" className={labelClass}>
              TikTok URL
            </label>
            <input
              id="socialTiktok"
              name="socialTiktok"
              type="url"
              maxLength={255}
              defaultValue={initialSettings.socialTiktok ?? ""}
              placeholder="https://tiktok.com/@..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-panel border-border bg-surface space-y-6 border p-6">
        <h2 className="text-text font-sans text-base font-semibold">Footer Text</h2>

        <div>
          <label htmlFor="footerText" className={labelClass}>
            Custom Footer Notice (optional)
          </label>
          <textarea
            id="footerText"
            name="footerText"
            rows={2}
            maxLength={300}
            defaultValue={initialSettings.footerText ?? ""}
            placeholder="e.g. Built with Portfolio OS."
            className={textareaClass}
          />
        </div>
      </section>

      {state.error ? (
        <div
          role="alert"
          className="rounded-card border-border bg-surface text-text border px-4 py-3 font-sans text-sm"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="rounded-card border-accent/40 bg-surface text-accent border px-4 py-3 font-sans text-sm"
        >
          Settings saved successfully.
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-card bg-accent text-bg px-6 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
