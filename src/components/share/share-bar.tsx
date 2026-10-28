"use client";

import { useState, useSyncExternalStore } from "react";

import { clipSummary, shareLinks, type ShareTarget } from "@/lib/share";

const noop = () => () => {};
/** True where the device has a native share sheet (most phones, some desktops). */
function useCanNativeShare() {
  return useSyncExternalStore(
    noop,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or a page without clipboard permission.
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}

const button =
  "border-border text-text hover:border-accent hover:text-accent focus-visible:border-accent inline-flex h-10 items-center justify-center gap-2 rounded-full border font-sans text-sm transition-colors";

/**
 * Share buttons for a piece of content: the device's own share sheet where
 * there is one, copy link, and one-tap links to X, LinkedIn, Facebook,
 * WhatsApp and email.
 */
export function ShareBar({
  url,
  title,
  text,
  className = "",
}: {
  url: string;
  title: string;
  text?: string | null;
  className?: string;
}) {
  const canNative = useCanNativeShare();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  async function onNativeShare() {
    try {
      await navigator.share({ title, text: clipSummary(text) || undefined, url });
    } catch {
      // Closing the share sheet rejects; nothing to do.
    }
  }

  return (
    <div className={className}>
      <p className="text-eyebrow text-text-muted font-mono uppercase">Share</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canNative ? (
          <button type="button" onClick={onNativeShare} className={`${button} px-4`}>
            <Icon name="share" />
            Share…
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCopy}
          className={`${button} px-4`}
          aria-live="polite"
        >
          <Icon name={copied ? "check" : "link"} />
          {copied ? "Link copied" : "Copy link"}
        </button>
        {shareLinks({ url, title, text }).map((link) => (
          <a
            key={link.id}
            href={link.href}
            {...(link.id === "email"
              ? {}
              : { target: "_blank", rel: "noopener noreferrer" })}
            aria-label={`Share on ${link.label}`}
            title={link.id === "email" ? "Share by email" : `Share on ${link.label}`}
            className={`${button} w-10`}
          >
            <Icon name={link.id} />
          </a>
        ))}
      </div>
    </div>
  );
}

function Icon({ name }: { name: ShareTarget | "link" | "check" | "share" }) {
  const filled = name === "x" || name === "linkedin" || name === "facebook";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

const ICONS: Record<ShareTarget | "link" | "check" | "share", React.ReactNode> = {
  x: (
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  ),
  linkedin: (
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  ),
  facebook: (
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
  ),
  whatsapp: (
    <>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M9.5 9.5c.3 1.6 1.4 3.6 3 4.5l1-1.1 2 .9-.4 1.6c-3.2.2-6.4-2.8-6.6-6.2l1.6-.4.9 2z" />
    </>
  ),
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </>
  ),
};
