"use client";

import { useActionState, useState } from "react";

import { CONTACT_REASONS } from "@/lib/validation/contact";

import { submitContactForm, type ContactFormState } from "./actions";

const inputClass =
  "rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none";
const textareaClass =
  "rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-serif text-sm outline-none";
const labelClass = "text-text-muted block font-sans text-sm";

const initialState: ContactFormState = {
  success: false,
};

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);
  const [resetKey, setResetKey] = useState(0);

  if (state.success && resetKey === 0) {
    return (
      <div className="rounded-panel border-border bg-surface border p-8">
        <h2 className="text-text font-sans text-lg font-semibold">Message sent.</h2>
        <p className="text-text-muted mt-2 font-serif text-sm leading-relaxed">
          Thank you for reaching out. Your message has been received and will be reviewed
          shortly.
        </p>
        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          className="rounded-card border-accent text-accent hover:bg-accent hover:text-bg mt-6 border px-4 py-2 font-sans text-sm transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
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

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Name <span className="text-accent">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Your name"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email <span className="text-accent">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-org" className={labelClass}>
            Organization <span className="text-text-muted/60">(optional)</span>
          </label>
          <input
            id="contact-org"
            name="organization"
            type="text"
            maxLength={150}
            autoComplete="organization"
            placeholder="Company, lab, or institution"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contact-reason" className={labelClass}>
            Reason <span className="text-text-muted/60">(optional)</span>
          </label>
          <select
            id="contact-reason"
            name="reason"
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled className="bg-surface text-text-muted">
              Select a topic
            </option>
            {CONTACT_REASONS.map((reason) => (
              <option key={reason} value={reason} className="bg-surface text-text">
                {reason}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message <span className="text-accent">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          minLength={5}
          maxLength={5000}
          placeholder="Details on what you're working on, looking to collaborate on, or wish to discuss..."
          className={textareaClass}
        />
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-card border-border bg-surface text-text border px-4 py-3 font-sans text-sm"
        >
          {state.error}
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-card bg-accent text-bg px-6 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
}
