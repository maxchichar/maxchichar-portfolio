import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { articleCreateSchema } from "@/lib/validation/article";
import * as articlesService from "@/server/services/articles";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function create(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/admin/login");

    const parsed = articleCreateSchema.safeParse({
      slug: formData.get("slug"),
      title: formData.get("title"),
      excerpt: formData.get("excerpt"),
    });
    if (!parsed.success) {
      redirect(
        `/admin/articles/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "invalid")}`,
      );
    }

    let articleId: string;
    try {
      const { article } = await articlesService.createArticle(parsed.data, {
        id: session.user.id,
        type: "HUMAN",
      });
      articleId = article.id;
    } catch (err) {
      if (err instanceof articlesService.ArticleServiceError) {
        redirect(`/admin/articles/new?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect(`/admin/articles/${articleId}`);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-text font-sans text-2xl font-semibold">New Article</h1>

      <form action={create} className="mt-8 space-y-5">
        <div>
          <label htmlFor="slug" className="text-text-muted block font-sans text-sm">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            placeholder="building-ai-systems"
            className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-mono text-sm outline-none"
          />
        </div>
        <div>
          <label htmlFor="title" className="text-text-muted block font-sans text-sm">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
          />
        </div>
        <div>
          <label htmlFor="excerpt" className="text-text-muted block font-sans text-sm">
            Excerpt
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            required
            rows={4}
            className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-serif text-sm outline-none"
          />
        </div>
        {error && (
          <p className="rounded-card border-border bg-surface text-text border px-3.5 py-2.5 font-sans text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="rounded-card bg-accent text-bg px-4 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
        >
          Create draft
        </button>
      </form>
    </main>
  );
}
