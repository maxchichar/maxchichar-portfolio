import "server-only";

import { listProjectsOverview } from "@/server/services/projects";

/** Projects a testimonial can be linked to, as { id, title }, A to Z. */
export async function projectOptions() {
  const overview = await listProjectsOverview();
  return overview
    .map(({ project, published, draft }) => ({
      id: project.id,
      title: published?.title ?? draft?.title ?? project.slug,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
