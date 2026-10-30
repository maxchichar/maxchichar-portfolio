import Link from "next/link";
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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 md:py-16">
      <Link
        href="/admin/testimonials"
        className="text-text-muted hover:text-text mb-4 inline-flex items-center gap-1.5 py-1 font-sans text-sm transition-colors"
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
          <path d="M12 15l-5-5 5-5" />
        </svg>
        Testimonials
      </Link>
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
