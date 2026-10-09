"use client";

import { useActionState, useState } from "react";

import { CONTACT_REASONS } from "@/lib/validation/contact";

import { submitContactForm, type ContactFormState } from "./actions";

const fieldClass =
  "rounded-card border-border bg-bg text-text placeholder:text-text-muted/60 hover:border-text/25 focus-visible:border-accent mt-2 w-full border px-4 py-3.5 font-sans text-base outline-none transition-colors";
const labelClass = "text-text block font-sans text-sm font-medium";
const optionalClass = "text-text-muted ml-1 font-normal";

const initialState: ContactFormState = {
  success: false,
};

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);
  const [resetKey, setResetKey] = useState(0);

  if (state.success && resetKey === 0) {
    return (
      <div role="status" className="animate-rise py-10 text-center">
        <span
          aria-hidden="true"
          className="bg-accent text-bg mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        >
          ✓
        </span>
        <h2 className="text-h3 text-text mt-6 font-sans font-semibold">Message sent.</h2>
        <p className="text-text-muted mx-auto mt-3 max-w-sm font-serif text-lg leading-relaxed">
          Thank you for reaching out. Your message has been received and will be reviewed
          shortly.
        </p>
        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          className="border-border text-text hover:border-accent hover:text-accent mt-8 rounded-full border px-5 py-2.5 font-sans text-sm transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-7">
      {/* Honeypot field for spam prevention — invisible to regular users */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website-hp">Website</label>
        <input
          id="website-hp"
          type="text"
          name="honeypot"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <fieldset>
        <legend className={labelClass}>
          What&apos;s this about?<span className={optionalClass}>(optional)</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONTACT_REASONS.map((reason) => (
            <label key={reason} className="cursor-pointer">
              <input type="radio" name="reason" value={reason} className="peer sr-only" />
              <span className="border-border text-text-muted hover:border-text/40 hover:text-text peer-checked:border-text peer-checked:bg-text peer-checked:text-bg peer-focus-visible:outline-accent inline-block rounded-full border px-4 py-2 font-sans text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {reason}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Your name"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-org" className={labelClass}>
          Organization<span className={optionalClass}>(optional)</span>
        </label>
        <input
          id="contact-org"
          name="organization"
          type="text"
          maxLength={150}
          autoComplete="organization"
          placeholder="Company, lab, or institution"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          minLength={5}
          maxLength={5000}
          placeholder="What you're working on, what you'd like to collaborate on, or what you'd like to discuss…"
          className={`${fieldClass} resize-y font-serif text-lg leading-relaxed`}
        />
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-card border-border bg-surface-2 text-text border px-4 py-3 font-sans text-sm"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <p className="text-text-muted font-sans text-xs">
          All fields required unless noted.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="group bg-text text-bg hover:bg-accent inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-sans text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send message"}
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
      </div>
    </form>
  );
}
