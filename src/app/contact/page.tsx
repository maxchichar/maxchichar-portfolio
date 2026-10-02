import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { constructPageMetadata } from "@/lib/metadata";

import { ContactForm } from "./contact-form";

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
      <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <header className="border-border border-b pb-10">
          <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
            Contact
          </p>
          <h1 className="text-text mt-4 font-sans text-3xl font-semibold tracking-tight md:text-4xl">
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
      <Footer />
    </>
  );
}
