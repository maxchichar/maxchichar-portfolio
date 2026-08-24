import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/admin/login?error=1");
      }
      throw err;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-accent-purple font-sans text-sm font-medium">Portfolio OS</p>
        <h1 className="text-text mt-2 font-sans text-2xl font-semibold">Sign in</h1>

        <form action={authenticate} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="text-text-muted block font-sans text-sm">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-text-muted block font-sans text-sm">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-card border-border bg-surface text-text border px-3.5 py-2.5 font-sans text-sm"
            >
              Invalid email or password.
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-card bg-accent text-bg w-full px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
