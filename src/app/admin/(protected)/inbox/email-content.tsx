"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { emailDocument } from "@/lib/email-html";

/**
 * An email as its sender designed it, in an iframe sandboxed without
 * scripts (same-origin only so the frame can be measured and fitted to the
 * column), with remote images held back until asked for. `children` is the
 * plain-text reading view, a tap away.
 */
export function EmailContent({
  html,
  remoteImages,
  children,
}: {
  html: string;
  remoteImages: boolean;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"original" | "text">("original");
  const [loadImages, setLoadImages] = useState(false);
  const [height, setHeight] = useState(480);
  const frame = useRef<HTMLIFrameElement>(null);

  // Newsletters are built ~600px wide: scale them down to the column, like
  // a phone mail app, and size the frame to its content.
  const fit = useCallback(() => {
    const iframe = frame.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc?.documentElement) return;
    const root = doc.documentElement;
    // Measure at full size, then scale; the frame takes the scaled height.
    root.style.zoom = "1";
    const available = iframe.clientWidth;
    const width = Math.max(root.scrollWidth, doc.body?.scrollWidth ?? 0);
    const fullHeight = Math.max(root.scrollHeight, doc.body?.scrollHeight ?? 0);
    const scale = width > available ? available / width : 1;
    root.style.zoom = String(scale);
    setHeight(Math.ceil(fullHeight * scale) || 480);
  }, []);

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(iframe);
    return () => observer.disconnect();
  }, [fit, view]);

  const onLoad = () => {
    fit();
    // Images arriving later change the height.
    const body = frame.current?.contentDocument?.body;
    if (body) new ResizeObserver(() => fit()).observe(body);
  };

  const tab = (value: "original" | "text", label: string) => (
    <button
      type="button"
      onClick={() => setView(value)}
      aria-pressed={view === value}
      className={`rounded-full px-3 py-1.5 font-sans text-xs transition-colors ${
        view === value ? "bg-text text-bg" : "text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="bg-surface-2 border-border inline-flex rounded-full border p-0.5">
          {tab("original", "Original")}
          {tab("text", "Text")}
        </div>
        {view === "original" && remoteImages && !loadImages ? (
          <button
            type="button"
            onClick={() => setLoadImages(true)}
            className="text-text-muted hover:text-text border-border hover:border-text/30 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-sans text-xs transition-colors"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <rect x="3" y="4" width="14" height="12" rx="2" />
              <circle cx="7.5" cy="8.5" r="1.5" />
              <path d="M17 13l-4-4-7 7" />
            </svg>
            Load images
          </button>
        ) : null}
      </div>

      {view === "original" ? (
        <>
          {remoteImages && !loadImages ? (
            <p className="text-text-muted mb-3 font-sans text-xs">
              Images are hidden so the sender can&apos;t tell you opened this.
            </p>
          ) : null}
          <div className="rounded-card border-border overflow-hidden border bg-white">
            <iframe
              ref={frame}
              key={loadImages ? "images" : "no-images"}
              title="Email as sent"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              srcDoc={emailDocument(html, { loadImages })}
              onLoad={onLoad}
              style={{ height }}
              className="block w-full border-0"
            />
          </div>
        </>
      ) : (
        children
      )}
    </div>
  );
}
