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
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
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
