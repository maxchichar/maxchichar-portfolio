import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-header";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/storage/r2";
import * as mediaRepo from "@/server/repositories/media";
import { getTestimonial } from "@/server/services/testimonials";

import { imageLibrary } from "../library";
import { projectOptions } from "../project-options";
import { TestimonialForm } from "../testimonial-form";
import { DeleteTestimonialButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const testimonial = await getTestimonial(id).catch(() => null);
  if (!testimonial) notFound();

  const [projects, libraryMedia, avatar] = await Promise.all([
    projectOptions(),
    imageLibrary(),
    testimonial.avatarMediaId ? mediaRepo.findById(db, testimonial.avatarMediaId) : null,
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <AdminPageHeader
        title="Edit testimonial"
        description={`From ${testimonial.authorName}`}
        actions={
          <DeleteTestimonialButton id={testimonial.id} author={testimonial.authorName} />
        }
      />
      <TestimonialForm
        projects={projects}
        libraryMedia={libraryMedia}
        initial={{
          id: testimonial.id,
          quote: testimonial.quote,
          authorName: testimonial.authorName,
          authorRole: testimonial.authorRole ?? "",
          authorCompany: testimonial.authorCompany ?? "",
          authorUrl: testimonial.authorUrl ?? "",
          avatarMediaId: testimonial.avatarMediaId,
          avatarUrl: avatar ? publicUrlFor(avatar.storageKey) : null,
          projectId: testimonial.projectId ?? "",
          featured: testimonial.featured,
          visible: testimonial.visible,
          sortOrder: testimonial.sortOrder,
        }}
      />
    </main>
  );
}
