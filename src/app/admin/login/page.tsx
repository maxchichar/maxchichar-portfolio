import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth/config";
import { getPublicSiteSettings } from "@/server/services/settings";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const settings = await getPublicSiteSettings();

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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="bg-surface relative hidden overflow-hidden lg:block">
        {settings.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.heroImage.url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
        ) : (
          <div aria-hidden="true" className="hero-wash absolute inset-0" />
        )}
        <div
          aria-hidden="true"
          className="from-bg via-bg/40 absolute inset-0 bg-gradient-to-t to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="text-text font-sans text-5xl font-semibold tracking-tighter xl:text-6xl">
            MAXCHICHAR
          </p>
          <p className="text-text-muted mt-3 font-serif text-base">
            {settings.siteDescription}
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="text-accent-purple font-mono text-xs tracking-[0.2em] uppercase">
            {settings.siteName} · Studio
          </p>
          <h1 className="text-text mt-3 font-sans text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-text-muted mt-2 font-serif text-sm">
            Sign in to manage your portfolio.
          </p>

          <form action={authenticate} className="mt-10 space-y-5">
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
                className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-3 font-sans text-sm outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-text-muted block font-sans text-sm"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-3 font-sans text-sm outline-none"
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
              className="rounded-card bg-accent text-bg w-full px-4 py-3 font-sans text-sm font-medium transition-opacity hover:opacity-90"
            >
              Sign in
            </button>
          </form>

          <Link
            href="/"
            className="text-text-muted hover:text-text mt-10 inline-block font-sans text-xs transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
