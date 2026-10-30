import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-header";
import { listTestimonialsAdmin } from "@/server/services/testimonials";

import { imageLibrary } from "../library";
import { projectOptions } from "../project-options";
import { TestimonialForm } from "../testimonial-form";

export const dynamic = "force-dynamic";

export default async function NewTestimonialPage() {
  const [{ available }, projects, libraryMedia] = await Promise.all([
    listTestimonialsAdmin(),
    projectOptions(),
    imageLibrary(),
  ]);
  if (!available) redirect("/admin/testimonials");

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
      <AdminPageHeader title="New testimonial" />
      <TestimonialForm
        projects={projects}
        libraryMedia={libraryMedia}
        initial={{
          id: null,
          quote: "",
          authorName: "",
          authorRole: "",
          authorCompany: "",
          authorUrl: "",
          avatarMediaId: null,
          avatarUrl: null,
          projectId: "",
          featured: true,
          visible: true,
          sortOrder: 0,
        }}
      />
    </main>
  );
}
