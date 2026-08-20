import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";

// Phase 1 scope only: this proves the design tokens, typography, and IA
// shell render correctly. No CMS data fetching happens until Phase 2+ —
// FINAL LOCKED SPECIFICATION §E. Empty-state sections below are the
// locked behavior for zero real content (§D.13 / original spec §38),
// not placeholder copy standing in for something else.

const EMPTY_STATES = [
  { title: "Selected Work", body: "Work is being documented." },
  { title: "Research", body: "Research is being documented." },
  { title: "Writing", body: "Writing is being documented." },
] as const;

export default function Home() {
  return (
    <>
      <Nav />

      <main>
        <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
          <p className="text-accent-purple font-sans text-sm font-medium tracking-wide">
            AI-Native Engineer &amp; Entrepreneur
          </p>

          <h1 className="text-text mt-4 max-w-3xl font-sans text-4xl font-semibold tracking-tight md:text-5xl">
            I build <span className="text-accent-purple">intelligent</span> systems for
            real-world problems.
          </h1>

          <p className="text-text-muted mt-6 max-w-xl font-serif text-lg">
            This is the Phase&nbsp;1 foundation of Portfolio&nbsp;OS — the design system,
            typography, and information architecture are wired and rendering. Content, the
            admin, and everything CMS-driven begin in Phase&nbsp;2.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/work"
              className="rounded-card bg-accent text-bg px-5 py-2.5 font-sans text-sm font-medium transition-opacity hover:opacity-90"
            >
              Explore my work
            </a>
            <a
              href="/research"
              className="rounded-card border-border text-text hover:border-accent hover:text-accent border px-5 py-2.5 font-sans text-sm font-medium transition-colors"
            >
              Read my research
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            {EMPTY_STATES.map((item) => (
              <div
                key={item.title}
                className="rounded-panel border-border bg-surface border p-6"
              >
                <h2 className="text-text font-sans text-sm font-medium">{item.title}</h2>
                <p className="text-text-muted mt-2 font-serif text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
