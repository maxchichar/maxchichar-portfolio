import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { SplitText } from "@/components/motion/split-text";
import { constructPageMetadata } from "@/lib/metadata";
import { getPublicSiteSettings } from "@/server/services/settings";

import { ContactForm } from "./contact-form";
import { PageTransition } from "@/components/motion/page-transition";

export const dynamic = "force-dynamic";

export const metadata: Metadata = constructPageMetadata({
  title: "Contact",
  description:
    "Get in touch regarding AI systems engineering, technical research, advisory, or collaboration.",
  path: "/contact",
});

export default async function ContactPage() {
  const settings = await getPublicSiteSettings();
  const socials = [
    { label: "GitHub", href: settings.socialGithub },
    { label: "LinkedIn", href: settings.socialLinkedin },
    { label: "X", href: settings.socialX },
    { label: "YouTube", href: settings.socialYoutube },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <>
      <Nav />
      <PageTransition>
        <main className="container-site pt-16 pb-8 md:pt-24">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <p className="animate-rise index-label">
                  <span aria-hidden="true" className="h-px w-6 bg-current" />
                  <span>Contact</span>
                </p>
                <h1 className="text-h1 text-text mt-6 font-sans font-semibold text-balance">
                  <SplitText text="Start a conversation." baseDelay={80} />
                </h1>
                <p
                  className="text-lede text-text-muted animate-rise mt-8 max-w-md font-serif"
                  style={{ animationDelay: "350ms" }}
                >
                  Have a question, an engineering challenge, or a research project to
                  discuss? Tell me a little about it.
                </p>

                <dl
                  className="animate-rise border-border mt-12 space-y-6 border-t pt-8"
                  style={{ animationDelay: "450ms" }}
                >
                  {settings.primaryEmail ? (
                    <div>
                      <dt className="text-eyebrow text-text-muted font-mono uppercase">
                        Email
                      </dt>
                      <dd className="mt-2">
                        <a
                          href={`mailto:${settings.primaryEmail}`}
                          className="text-text hover:text-accent font-sans text-lg underline-offset-4 transition-colors hover:underline"
                        >
                          {settings.primaryEmail}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {socials.length > 0 ? (
                    <div>
                      <dt className="text-eyebrow text-text-muted font-mono uppercase">
                        Elsewhere
                      </dt>
                      <dd className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                        {socials.map((s) => (
                          <a
                            key={s.label}
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text hover:text-accent font-sans text-sm transition-colors"
                          >
                            {s.label} <span aria-hidden="true">↗</span>
                          </a>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>

            <section
              aria-label="Contact form"
              className="animate-rise rounded-panel border-border bg-surface border p-6 sm:p-10 lg:col-span-7"
              style={{ animationDelay: "300ms" }}
            >
              <ContactForm />
            </section>
          </div>
        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
