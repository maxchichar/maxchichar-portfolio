import { EVIDENCE_TYPES } from "@/lib/validation/evidence";

import { addEvidenceForm, removeEvidenceForm } from "../actions";

type EvidenceRow = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  url: string | null;
  data: unknown;
};

export function EvidencePanel({
  projectId,
  evidence,
  error,
}: {
  projectId: string;
  evidence: EvidenceRow[];
  error?: string;
}) {
  return (
    <section className="border-border mt-10 border-t pt-6">
      <h2 className="text-text font-sans text-sm font-medium">Evidence</h2>

      <div className="mt-3 space-y-2">
        {evidence.length === 0 ? (
          <p className="text-text-muted font-serif text-sm">No evidence attached yet.</p>
        ) : (
          evidence.map((e) => (
            <div
              key={e.id}
              className="rounded-card border-border bg-surface flex items-start justify-between border px-4 py-2.5"
            >
              <div>
                <span className="text-text-muted font-mono text-xs">{e.type}</span>
                <span className="text-text ml-2 font-sans text-sm">{e.label}</span>
                {e.data ? (
                  <p className="text-text-muted mt-0.5 font-mono text-xs">
                    {JSON.stringify(e.data)}
                  </p>
                ) : null}
              </div>
              <form action={removeEvidenceForm}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="evidenceId" value={e.id} />
                <button
                  type="submit"
                  className="text-text-muted hover:text-text font-sans text-xs"
                >
                  Remove
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      <form
        action={addEvidenceForm}
        className="rounded-panel border-border bg-surface mt-4 space-y-3 border p-4"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid grid-cols-2 gap-3">
          <select
            name="type"
            defaultValue="repository"
            className="rounded-card border-border bg-bg text-text focus-visible:border-accent border px-3 py-2 font-sans text-sm outline-none"
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="label"
            placeholder="Label"
            required
            className="rounded-card border-border bg-bg text-text focus-visible:border-accent border px-3 py-2 font-sans text-sm outline-none"
          />
        </div>
        <input
          name="description"
          placeholder="Description (optional)"
          className="rounded-card border-border bg-bg text-text focus-visible:border-accent w-full border px-3 py-2 font-sans text-sm outline-none"
        />
        <input
          name="url"
          placeholder="URL (optional)"
          className="rounded-card border-border bg-bg text-text focus-visible:border-accent w-full border px-3 py-2 font-sans text-sm outline-none"
        />
        {/* metric/before/after/unit only matter for measurement/before_after types;
            harmless to always render them — the action ignores extras for other types. */}
        <div className="grid grid-cols-4 gap-3">
          <input
            name="metric"
            placeholder="Metric (measurement/before-after only)"
            className="rounded-card border-border bg-bg text-text focus-visible:border-accent border px-3 py-2 font-sans text-sm outline-none"
          />
          <input
            name="before"
            placeholder="Before"
            className="rounded-card border-border bg-bg text-text focus-visible:border-accent border px-3 py-2 font-sans text-sm outline-none"
          />
          <input
            name="after"
            placeholder="After"
            className="rounded-card border-border bg-bg text-text focus-visible:border-accent border px-3 py-2 font-sans text-sm outline-none"
          />
          <input
            name="unit"
            placeholder="Unit"
            className="rounded-card border-border bg-bg text-text focus-visible:border-accent border px-3 py-2 font-sans text-sm outline-none"
          />
        </div>
        {error && <p className="text-text font-sans text-sm">{error}</p>}
        <button
          type="submit"
          className="rounded-card border-border text-text hover:border-accent border px-4 py-2 font-sans text-sm transition-colors"
        >
          Add evidence
        </button>
      </form>
    </section>
  );
}
