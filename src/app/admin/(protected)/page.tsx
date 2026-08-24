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

      <div className="rounded-panel border-border bg-surface mt-6 border p-6">
        <h2 className="text-text font-sans text-sm font-medium">Phase 2 status</h2>
        <p className="text-text-muted mt-2 font-serif text-sm">
          Database, authentication, and route protection are live. Project, research, and
          article editors, the media library, and everything else content-facing begin in
          later phases.
        </p>
      </div>
    </main>
  );
}
