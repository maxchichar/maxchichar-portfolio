"use client";

import { EditorSection } from "@/components/admin/editor/editor-section";
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
    <EditorSection
      title="CV / Résumé"
      description="Shown as a Download CV button on the About and Contact pages, and at /cv. PDF, up to 8 MB. Changes go live as soon as you choose a file."
    >
      <DocumentField
        label="CV (PDF)"
        initial={initial}
        publicHref="/cv"
        disabledReason={disabledReason}
        onCommit={(id) => saveSiteDocument("cv", id)}
      />
    </EditorSection>
  );
}
