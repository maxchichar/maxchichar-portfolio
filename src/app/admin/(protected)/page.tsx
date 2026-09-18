import Link from "next/link";

import { auth, signOut } from "@/lib/auth/config";

export default async function AdminDashboard() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-accent-purple font-sans text-sm font-medium">Portfolio OS</p>
      <h1 className="text-text mt-2 font-sans text-2xl font-semibold">Admin</h1>

      <div className="rounded-panel border-border bg-surface mt-8 border p-6">
        <p className="text-text font-sans text-sm">
          Signed in as <span className="text-text-muted">{session?.user?.email}</span>
        </p>
        <p className="text-text-muted mt-1 font-mono text-xs">
          role: {session?.user?.role}
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="rounded-card border-accent text-accent hover:bg-accent hover:text-bg border px-4 py-2 font-sans text-sm transition-colors"
          >
            Log out
          </button>
        </form>
      </div>

      <Link
        href="/admin/projects"
        className="rounded-panel border-border bg-surface hover:border-accent/40 mt-6 flex items-center justify-between border p-6 transition-colors"
      >
        <div>
          <h2 className="text-text font-sans text-sm font-medium">Projects</h2>
          <p className="text-text-muted mt-1 font-serif text-sm">
            Create, version, publish, and roll back projects.
          </p>
        </div>
        <span className="text-accent font-sans text-sm">→</span>
      </Link>

      <Link
        href="/admin/research"
        className="rounded-panel border-border bg-surface hover:border-accent/40 mt-3 flex items-center justify-between border p-6 transition-colors"
      >
        <div>
          <h2 className="text-text font-sans text-sm font-medium">Research</h2>
          <p className="text-text-muted mt-1 font-serif text-sm">
            Create research drafts. Editing and publishing land in a later level.
          </p>
        </div>
        <span className="text-accent font-sans text-sm">→</span>
      </Link>

      <Link
        href="/admin/articles"
        className="rounded-panel border-border bg-surface hover:border-accent/40 mt-3 flex items-center justify-between border p-6 transition-colors"
      >
        <div>
          <h2 className="text-text font-sans text-sm font-medium">Writing</h2>
          <p className="text-text-muted mt-1 font-serif text-sm">
            Create article drafts. Editing and publishing land in a later level.
          </p>
        </div>
        <span className="text-accent font-sans text-sm">→</span>
      </Link>

      <div className="rounded-panel border-border bg-surface mt-6 border p-6">
        <h2 className="text-text font-sans text-sm font-medium">Phase 3 status</h2>
        <p className="text-text-muted mt-2 font-serif text-sm">
          Project version lifecycle, evidence, and tags are live. Research/article
          editors, the media upload pipeline, and public pages begin in later phases.
        </p>
      </div>
    </main>
  );
}
