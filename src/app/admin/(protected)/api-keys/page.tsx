import { ConfirmForm } from "@/components/admin/confirm-form";
import { EditorSection } from "@/components/admin/editor/editor-section";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SCOPE_LABELS, type ApiScope } from "@/lib/api-keys";
import { listApiKeys } from "@/server/services/api-keys";

import { revokeApiKeyForm } from "./actions";
import { CreateKeyForm } from "./create-key-form";

export const dynamic = "force-dynamic";

function when(date: Date | null) {
  if (!date) return "never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ApiKeysPage() {
  const keys = await listApiKeys();
  const active = keys.filter((k) => !k.revokedAt);
  const revoked = keys.filter((k) => k.revokedAt);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10 md:py-12">
      <AdminPageHeader
        title="API keys"
        description="Let other tools, such as an AI writing agent, read your articles and create or edit drafts through the Content API. Nothing they send goes live until you publish it."
      />

      <div className="space-y-6">
        <EditorSection title="New key">
          <CreateKeyForm />
        </EditorSection>

        <EditorSection
          title="Active keys"
          description={`Requests go to https://admin.chibuezemaxwell.com/api/v1 with the header Authorization: Bearer <key>. See docs/CONTENT-API.md.`}
        >
          {active.length === 0 ? (
            <p className="text-text-muted font-sans text-sm">No active keys.</p>
          ) : (
            <ul className="divide-border divide-y">
              {active.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-text font-sans text-sm font-medium">{k.name}</p>
                    <p className="text-text-muted mt-0.5 font-sans text-xs">
                      {k.scopes.map((s) => SCOPE_LABELS[s as ApiScope] ?? s).join(" · ")}
                    </p>
                    <p className="text-text-muted mt-0.5 font-mono text-[11px]">
                      created {when(k.createdAt)} · last used {when(k.lastUsedAt)}
                    </p>
                  </div>
                  <ConfirmForm
                    action={revokeApiKeyForm}
                    title={`Revoke “${k.name}”?`}
                    description="Anything using this key stops working straight away. Drafts it already created stay."
                    label="Revoke"
                  >
                    <input type="hidden" name="id" value={k.id} />
                  </ConfirmForm>
                </li>
              ))}
            </ul>
          )}
        </EditorSection>

        {revoked.length ? (
          <EditorSection title="Revoked">
            <ul className="space-y-1">
              {revoked.map((k) => (
                <li key={k.id} className="text-text-muted font-sans text-xs">
                  {k.name} · revoked {when(k.revokedAt)}
                </li>
              ))}
            </ul>
          </EditorSection>
        ) : null}
      </div>
    </main>
  );
}
