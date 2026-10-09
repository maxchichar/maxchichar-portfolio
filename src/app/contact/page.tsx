import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { constructPageMetadata } from "@/lib/metadata";

import { ContactForm } from "./contact-form";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";

export const metadata: Metadata = constructPageMetadata({
  title: "Contact",
  description:
    "Get in touch regarding AI systems engineering, technical research, advisory, or collaboration.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <Nav />
      <PageTransition>
        <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <header className="border-border border-b pb-12">
            <p className="animate-rise index-label">
              <span>—</span>
              <span>Contact</span>
            </p>
            <h1 className="animate-rise text-text mt-6 font-sans text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.03em]">
              Start a conversation.
            </h1>
            <p className="text-text-muted mt-4 font-serif text-base leading-relaxed md:text-lg">
              Have a question, an engineering challenge, or a research project to discuss?
              Reach out directly using the form below.
            </p>
          </header>

          <section className="mt-10">
            <ContactForm />
          </section>
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
