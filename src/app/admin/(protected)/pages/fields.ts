import { contentSchemaForSlug, type PageSlug } from "@/lib/validation/page";

// The editor layout for each fixed page: which fields it has, grouped into
// sections, with the labels and hints the admin sees. The save action reads
// the same list, so a field can't be shown without also being saved.

export interface PageField {
  name: string;
  label: string;
  hint?: string;
  /** Single-line input rather than a growing textarea. */
  short?: boolean;
  rows?: number;
}

export interface PageFieldSection {
  title: string;
  description?: string;
  fields: readonly PageField[];
}

const PARAGRAPHS_HINT = "Leave a blank line between paragraphs.";
const LIST_HINT = 'Start lines with "- " to show them as a list.';

export const PAGE_SECTIONS: Record<PageSlug, readonly PageFieldSection[]> = {
  home: [
    {
      title: "Hero",
      description: "The first screen of the home page.",
      fields: [
        { name: "heroEyebrow", label: "Eyebrow", short: true },
        { name: "heroHeadline", label: "Headline", short: true },
        { name: "heroBody", label: "Body", rows: 3 },
      ],
    },
    {
      title: "Calls to action",
      description: "Links are a site path like /work, or a full https:// URL.",
      fields: [
        { name: "heroPrimaryCtaLabel", label: "Primary button label", short: true },
        { name: "heroPrimaryCtaHref", label: "Primary button link", short: true },
        { name: "heroSecondaryCtaLabel", label: "Secondary button label", short: true },
        { name: "heroSecondaryCtaHref", label: "Secondary button link", short: true },
      ],
    },
    {
      title: "Current focus",
      fields: [{ name: "currentFocusSummary", label: "Summary", rows: 3 }],
    },
  ],
  about: [
    {
      title: "Introduction",
      description:
        "Shown large beside your portrait, and used as the page's search and share description. Your name and portrait come from Settings.",
      fields: [
        {
          name: "intro",
          label: "Intro",
          hint: "One or two sentences. The first ~160 characters appear in search results.",
          rows: 2,
        },
      ],
    },
    {
      title: "Story",
      description: "Numbered sections 01–03 on the page.",
      fields: [
        { name: "bio", label: "Biography", hint: PARAGRAPHS_HINT, rows: 4 },
        { name: "whatIBuild", label: "What I build", hint: PARAGRAPHS_HINT },
        { name: "howIThink", label: "How I think", hint: PARAGRAPHS_HINT },
      ],
    },
    {
      title: "Focus",
      description: "Numbered sections 04–06 on the page.",
      fields: [
        { name: "interests", label: "Areas of interest", hint: LIST_HINT },
        { name: "capabilities", label: "Capabilities", hint: LIST_HINT },
        { name: "direction", label: "Current direction", hint: PARAGRAPHS_HINT },
      ],
    },
  ],
  now: [
    {
      title: "Thesis",
      fields: [{ name: "thesis", label: "Current thesis", hint: PARAGRAPHS_HINT }],
    },
    {
      title: "Right now",
      fields: [
        { name: "currentlyBuilding", label: "Currently building", hint: LIST_HINT },
        { name: "researching", label: "Currently researching", hint: LIST_HINT },
        { name: "learning", label: "Currently learning", hint: LIST_HINT },
        { name: "interests", label: "Current interests", hint: LIST_HINT },
      ],
    },
    {
      title: "Changelog",
      fields: [{ name: "recentChanges", label: "Recent changes", hint: LIST_HINT }],
    },
  ],
};

export function pageFields(slug: PageSlug): PageField[] {
  return PAGE_SECTIONS[slug].flatMap((section) => section.fields);
}

/** The schema's own character limit for a field, so the counter can't drift. */
export function fieldMaxLength(slug: PageSlug, name: string): number {
  const shape = contentSchemaForSlug(slug).shape as Record<
    string,
    { maxLength?: number | null }
  >;
  return shape[name]?.maxLength ?? 2000;
}
