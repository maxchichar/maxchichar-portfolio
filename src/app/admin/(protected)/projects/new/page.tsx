import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { projectCreateSchema } from "@/lib/validation/project";
import * as projectService from "@/server/services/projects";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function create(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/admin/login");

    const parsed = projectCreateSchema.safeParse({
      slug: formData.get("slug"),
      title: formData.get("title"),
      shortDescription: formData.get("shortDescription"),
    });
    if (!parsed.success) {
      redirect(
        `/admin/projects/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "invalid")}`,
      );
    }

    let projectId: string;
    try {
      const { project } = await projectService.createProject(parsed.data, {
        id: session.user.id,
        type: "HUMAN",
      });
      projectId = project.id;
    } catch (err) {
      if (err instanceof projectService.ProjectServiceError) {
        redirect(`/admin/projects/new?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect(`/admin/projects/${projectId}`);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-text font-sans text-2xl font-semibold">New Project</h1>

      <form action={create} className="mt-8 space-y-5">
        <div>
          <label htmlFor="slug" className="text-text-muted block font-sans text-sm">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            placeholder="cryptoscan"
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
          <label
            htmlFor="shortDescription"
            className="text-text-muted block font-sans text-sm"
          >
            Short description
          </label>
          <textarea
            id="shortDescription"
            name="shortDescription"
            required
            rows={3}
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
