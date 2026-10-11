"use client";

import {
  DocumentField,
  type DocumentFieldValue,
} from "@/components/admin/document-field";

import { saveSiteDocument } from "./actions";

export function CvSection({
  initial,
  disabledReason,
}: {
  initial: DocumentFieldValue | null;
  disabledReason: string | null;
}) {
  return (
    <section className="rounded-panel border-border bg-surface mt-8 space-y-6 border p-6">
      <div>
        <h2 className="text-text font-sans text-base font-semibold">CV / Résumé</h2>
        <p className="text-text-muted mt-1 font-serif text-xs">
          Shown as a Download CV button on the About and Contact pages, at /cv. PDF, up to
          8MB. Changes go live immediately.
        </p>
      </div>
      <DocumentField
        label="CV (PDF)"
        initial={initial}
        publicHref="/cv"
        disabledReason={disabledReason}
        onCommit={(id) => saveSiteDocument("cv", id)}
      />
    </section>
  );
}
