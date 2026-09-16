import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { RESEARCH_TYPES, researchCreateSchema } from "@/lib/validation/research";
import * as researchService from "@/server/services/research";

export default async function NewResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function create(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/admin/login");

    const parsed = researchCreateSchema.safeParse({
      slug: formData.get("slug"),
      title: formData.get("title"),
      type: formData.get("type"),
      abstract: formData.get("abstract"),
    });
    if (!parsed.success) {
      redirect(
        `/admin/research/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "invalid")}`,
      );
    }

    let researchId: string;
    try {
      const { research } = await researchService.createResearch(parsed.data, {
        id: session.user.id,
        type: "HUMAN",
      });
      researchId = research.id;
    } catch (err) {
      if (err instanceof researchService.ResearchServiceError) {
        redirect(`/admin/research/new?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect(`/admin/research/${researchId}`);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-text font-sans text-2xl font-semibold">New Research</h1>

      <form action={create} className="mt-8 space-y-5">
        <div>
          <label htmlFor="slug" className="text-text-muted block font-sans text-sm">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            placeholder="post-quantum-migration"
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
          <label htmlFor="type" className="text-text-muted block font-sans text-sm">
            Type
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue=""
            className="rounded-card border-border bg-surface text-text focus-visible:border-accent mt-1.5 w-full border px-3.5 py-2.5 font-sans text-sm outline-none"
          >
            <option value="" disabled>
              Select a type
            </option>
            {RESEARCH_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="abstract" className="text-text-muted block font-sans text-sm">
            Abstract
          </label>
          <textarea
            id="abstract"
            name="abstract"
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
