import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";

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

  return <>{children}</>;
}
