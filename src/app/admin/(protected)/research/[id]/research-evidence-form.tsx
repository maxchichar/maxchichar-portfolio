"use client";

import { useActionState, useState } from "react";
import { EVIDENCE_TYPES } from "@/lib/validation/evidence";
import { inputClass, labelClass } from "@/components/admin/editor/styles";
import { addEvidenceForm } from "../actions";

type FormState = {
  saved?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export function ResearchEvidenceForm({ researchId }: { researchId: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [type, setType] = useState("paper");
  const [state, submit, pending] = useActionState(
    async (_previous: FormState, form: FormData): Promise<FormState> => {
      try {
        const result = await addEvidenceForm(form);
        if (!result.error && !result.fieldErrors) {
          setValues({});
          return { saved: true };
        }
        return result;
      } catch {
        return { error: "Could not save evidence. Please try again." };
      }
    },
    {},
  );
  const quantitative = type === "measurement" || type === "before_after";
  const context = quantitative || type === "paper" || type === "dataset";
  const fields: [string, string, number, boolean?][] = [
    ["label", "Label", 160, true],
    ["description", "Description", 600],
    ["url", "URL", 2048],
    ...(quantitative
      ? ([
          ["metric", "Metric", 120, true],
          ...(type === "measurement"
            ? [["value", "Observed value", 60, true]]
            : [
                ["before", "Before", 60, true],
                ["after", "After", 60, true],
              ]),
          ["unit", "Unit", 30],
        ] as [string, string, number, boolean?][])
      : []),
    ...(context
      ? ([
          ["observationPeriod", "Observation period / dataset coverage", 160],
          ["source", "Source / citation", 600],
          ["method", "Method", 1200],
          ["limitations", "Limitations", 1200],
        ] as [string, string, number, boolean?][])
      : []),
  ];
  return (
    <form
      action={submit}
      className="rounded-panel border-border bg-bg mt-4 space-y-3 border p-4"
    >
      <input type="hidden" name="researchId" value={researchId} />
      <fieldset disabled={pending} className="space-y-3">
        <legend className={labelClass}>Add evidence</legend>
        <label className={labelClass} htmlFor="evidence-type">
          Type
        </label>
        <select
          id="evidence-type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={inputClass}
          aria-invalid={!!state.fieldErrors?.type}
          aria-describedby={state.fieldErrors?.type ? "evidence-type-error" : undefined}
        >
          {[
            "paper",
            "dataset",
            "measurement",
            "before_after",
            ...EVIDENCE_TYPES.filter(
              (t) => !["paper", "dataset", "measurement", "before_after"].includes(t),
            ),
          ].map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        {state.fieldErrors?.type ? (
          <p id="evidence-type-error" role="alert">
            {state.fieldErrors.type}
          </p>
        ) : null}
        <p className="text-text-muted text-sm">
          Only enter sourced evidence. Optional fields can be left empty. Measurements use
          one observed value; comparisons require both values.
        </p>
        {fields.map(([name, label, max, required]) => {
          const error = state.fieldErrors?.[name];
          return (
            <div key={name}>
              <label htmlFor={`evidence-${name}`} className={labelClass}>
                {label}
                {required ? " *" : " (optional)"}
              </label>
              <input
                id={`evidence-${name}`}
                name={name}
                required={required}
                maxLength={max}
                value={values[name] ?? ""}
                onChange={(event) =>
                  setValues((previous) => ({ ...previous, [name]: event.target.value }))
                }
                className={inputClass}
                aria-invalid={!!error}
                aria-describedby={error ? `evidence-${name}-error` : undefined}
              />
              {error ? (
                <p
                  id={`evidence-${name}-error`}
                  role="alert"
                  className="text-text mt-1 text-sm"
                >
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
        <button
          type="submit"
          className="rounded-card border-border text-text hover:border-accent border px-4 py-2 font-sans text-sm"
        >
          {pending ? "Saving…" : "Add evidence"}
        </button>
      </fieldset>
      {state.saved ? <p role="status">Evidence added.</p> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
