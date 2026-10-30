import { EvidenceForm } from "@/components/admin/editor/evidence-form";
import { ResearchEvidenceForm } from "./research-evidence-form";

import { removeEvidenceForm } from "../actions";

type EvidenceRow = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  url: string | null;
  data: unknown;
};

export function EvidencePanel({
  researchId,
  evidence,
  error,
}: {
  researchId: string;
  evidence: EvidenceRow[];
  error?: string;
}) {
  return (
    <section className="rounded-panel border-border bg-surface border p-4 sm:p-6">
      <h2 className="text-text font-sans text-sm font-semibold">Evidence</h2>

      <div className="mt-3 space-y-2">
        {evidence.length === 0 ? (
          <p className="text-text-muted font-serif text-sm">No evidence attached yet.</p>
        ) : (
          evidence.map((e) => (
            <div
              key={e.id}
              className="rounded-card border-border bg-bg flex items-start justify-between gap-3 border px-3 py-2.5 sm:px-4"
            >
              <div className="min-w-0">
                <span className="text-text-muted font-mono text-xs">{e.type}</span>
                <span className="text-text ml-2 font-sans text-sm [overflow-wrap:anywhere]">
                  {e.label}
                </span>
                {e.data ? (
                  <p className="text-text-muted mt-0.5 font-mono text-xs [overflow-wrap:anywhere]">
                    {JSON.stringify(e.data)}
                  </p>
                ) : null}
              </div>
              <EvidenceForm action={removeEvidenceForm}>
                <input type="hidden" name="researchId" value={researchId} />
                <input type="hidden" name="evidenceId" value={e.id} />
                <button
                  type="submit"
                  className="text-text-muted hover:text-text -my-1 shrink-0 py-1 font-sans text-xs"
                >
                  Remove
                </button>
              </EvidenceForm>
            </div>
          ))
        )}
      </div>

      {error ? (
        <p role="alert" className="text-text mt-3 font-sans text-sm">
          {error}
        </p>
      ) : null}
      <ResearchEvidenceForm researchId={researchId} />
    </section>
  );
}
