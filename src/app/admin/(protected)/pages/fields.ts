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
  /** Browser-side format check, mirroring the schema, with its message. */
  pattern?: { regex: string; message: string };
}

export interface PageFieldSection {
  title: string;
  description?: string;
  /** Lay the fields out side by side in pairs (e.g. a label and its link). */
  columns?: 2;
  fields: readonly PageField[];
}

const PARAGRAPHS_HINT = "Leave a blank line between paragraphs.";
const LIST_HINT = 'Start lines with "- " to show them as a list.';

// Same rule as validation/page.ts's ctaHrefSchema, checked before submitting.
const LINK_PATTERN = {
  regex: "(/(?!/)|https?://)\\S*",
  message: "Use a site path starting with / (like /work) or a full https:// URL.",
};

export const PAGE_SECTIONS: Record<PageSlug, readonly PageFieldSection[]> = {
  home: [
    {
      title: "Hero",
      description:
        "The first screen of the site, over the hero image. The image and your name come from Settings.",
      fields: [
        {
          name: "heroEyebrow",
          label: "Eyebrow",
          hint: "The small uppercase line above the headline. Separate roles with · if you like.",
          short: true,
        },
        {
          name: "heroHeadline",
          label: "Headline",
          hint: 'Wrap words in *asterisks* to accent them in purple italics, e.g. "I build *intelligent* systems". Without asterisks, the word "intelligent" is accented.',
          rows: 2,
        },
        {
          name: "heroBody",
          label: "Body",
          hint: "One or two sentences under the headline.",
          rows: 3,
        },
      ],
    },
    {
      title: "Buttons",
      description:
        "The two buttons beside the hero text: the first is solid, the second outlined.",
      columns: 2,
      fields: [
        { name: "heroPrimaryCtaLabel", label: "First button label", short: true },
        {
          name: "heroPrimaryCtaHref",
          label: "First button link",
          short: true,
          pattern: LINK_PATTERN,
        },
        { name: "heroSecondaryCtaLabel", label: "Second button label", short: true },
        {
          name: "heroSecondaryCtaHref",
          label: "Second button link",
          short: true,
          pattern: LINK_PATTERN,
        },
      ],
    },
    {
      title: "Currently",
      description:
        'The highlighted "Currently" panel between Research and Writing. It appears once the Home page is published.',
      fields: [
        {
          name: "currentFocusSummary",
          label: "Current focus",
          hint: "A sentence or two; it's shown large. Blank lines start new paragraphs.",
          rows: 3,
        },
      ],
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
      description:
        "Shown large as a quote at the top, and used as the page's search and share description. Publishing resets the page's \"Updated\" date.",
      fields: [
        {
          name: "thesis",
          label: "Current thesis",
          hint: "One or two sentences read best at this size. The first ~160 characters appear in search results.",
          rows: 2,
        },
      ],
    },
    {
      title: "Right now",
      description: "The four numbered cards 01–04, in this order.",
      fields: [
        { name: "currentlyBuilding", label: "01 · Building", hint: LIST_HINT },
        { name: "researching", label: "02 · Researching", hint: LIST_HINT },
        { name: "learning", label: "03 · Learning", hint: LIST_HINT },
        { name: "interests", label: "04 · Interested in", hint: LIST_HINT },
      ],
    },
    {
      title: "Recent changes",
      description: "The short log at the bottom of the page.",
      fields: [
        {
          name: "recentChanges",
          label: "Recent changes",
          hint: `${LIST_HINT} Newest first reads best.`,
        },
      ],
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
