import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { auth, signOut } from "@/lib/auth/config";
import { getPublicSiteSettings } from "@/server/services/settings";

// Authoritative route protection for everything under /admin except
// /admin/login (which lives outside this route group precisely so it
// isn't guarded by itself). This is a Server Component, so it runs on
// every request server-side and calls the database-backed `auth()` check
// directly — this is the actual enforcement, not middleware/UI hiding
// (FINAL LOCKED SPECIFICATION §D.12 / this phase's §18).
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const settings = await getPublicSiteSettings();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav
        siteName={settings.siteName}
        email={session.user.email ?? null}
        signOutSlot={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              aria-label="Log out"
              title="Log out"
              className="text-text-muted hover:text-accent p-1.5 transition-colors"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h3M12 14l4-4-4-4M16 10H8" />
              </svg>
            </button>
          </form>
        }
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
