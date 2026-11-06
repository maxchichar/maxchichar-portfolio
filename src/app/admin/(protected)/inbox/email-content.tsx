"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { emailDocument } from "@/lib/email-html";

/**
 * An email as its sender designed it, in an iframe sandboxed without
 * scripts (same-origin only so the frame can be measured and fitted to the
 * column). Remote images load straight away, but through our own image
 * proxy, so senders never see the admin's browser or IP. `children` is the
 * plain-text reading view, a tap away.
 */
export function EmailContent({
  html,
  children,
}: {
  html: string;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"original" | "text">("original");
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
      </div>

      {view === "original" ? (
        <div className="rounded-card border-border overflow-hidden border bg-white">
          <iframe
            ref={frame}
            title="Email as sent"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            srcDoc={emailDocument(html, { loadImages: true })}
            onLoad={onLoad}
            style={{ height }}
            className="block w-full border-0"
          />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
