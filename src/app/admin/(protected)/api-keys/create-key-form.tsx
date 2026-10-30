"use client";

import { useActionState, useState } from "react";

import { hintClass, inputClass, labelClass } from "@/components/admin/editor/styles";
import { GRANTABLE_SCOPES, SCOPE_LABELS } from "@/lib/api-scopes";

import { createApiKeyAction, type CreateKeyState } from "./actions";

/** Creates a key and shows it once, with a copy button. */
export function CreateKeyForm() {
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(
    createApiKeyAction,
    null,
  );
  const [copied, setCopied] = useState(false);

  async function copy(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      {state?.key ? (
        <div
          role="status"
          className="rounded-card border-accent/40 bg-accent/5 space-y-3 border p-4"
        >
          <p className="text-text font-sans text-sm font-semibold">
            Copy the key for “{state.name}” now. It won&apos;t be shown again.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="bg-bg border-border text-text flex-1 rounded-lg border px-3 py-2 font-mono text-xs break-all select-all">
              {state.key}
            </code>
            <button
              type="button"
              onClick={() => copy(state.key ?? "")}
              className="bg-text text-bg hover:bg-accent shrink-0 rounded-full px-4 py-2 font-sans text-xs font-medium transition-colors"
            >
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
          <p className={hintClass}>
            Store it somewhere safe, like your password manager or the tool&apos;s secret
            settings. If it&apos;s lost or leaked, revoke it and create a new one.
          </p>
        </div>
      ) : null}

      <form action={action} className="space-y-5" onSubmit={() => setCopied(false)}>
        <div>
          <label htmlFor="key-name" className={labelClass}>
            Name
          </label>
          <input
            id="key-name"
            name="name"
            required
            maxLength={80}
            placeholder="e.g. Writing agent"
            className={inputClass}
          />
          <p className={hintClass}>
            Which tool or person will use it. Shown in the list below.
          </p>
        </div>

        <fieldset>
          <legend className={labelClass}>Permissions</legend>
          <div className="mt-2 space-y-2">
            {GRANTABLE_SCOPES.map((scope) => (
              <label
                key={scope}
                className="text-text flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1 font-sans text-sm sm:py-0"
              >
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope}
                  defaultChecked={scope === "content:read"}
                  className="accent-accent h-5 w-5 sm:h-4 sm:w-4"
                />
                {SCOPE_LABELS[scope]}{" "}
                <code className="text-text-muted font-mono text-[11px]">{scope}</code>
              </label>
            ))}
          </div>
          <p className={hintClass}>
            No key can publish. Drafts created or edited through the API wait for you to
            review and publish them here.
          </p>
        </fieldset>

        {state?.error ? (
          <p role="alert" className="text-accent font-sans text-sm">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-card bg-accent text-bg w-full px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:py-2"
        >
          {pending ? "Creating…" : "Create key"}
        </button>
      </form>
    </div>
  );
}
