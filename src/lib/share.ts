/**
 * Share links for a page: plain URLs to each network's own share screen, so
 * no third-party scripts load (nothing to slow the page or track visitors).
 * The networks build the preview from the page's Open Graph card.
 */

export type ShareTarget = "x" | "linkedin" | "facebook" | "whatsapp" | "email";

export interface ShareLink {
  id: ShareTarget;
  label: string;
  href: string;
}

/** A summary short enough for a share sheet or email: about 200 characters. */
export function clipSummary(text: string | null | undefined, max = 200): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function shareLinks({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  /** A one-line summary, used where the network takes extra text. */
  text?: string | null;
}): ShareLink[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const clipped = clipSummary(text);
  const summary = clipped ? `${clipped}\n\n` : "";
  return [
    { id: "x", label: "X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
      id: "email",
      label: "Email",
      href: `mailto:?subject=${t}&body=${encodeURIComponent(`${summary}${url}`)}`,
    },
  ];
}
