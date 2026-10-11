"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { SCROLL_LOCK_EVENT } from "@/components/motion/smooth-scroll";
import { switchTheme } from "@/components/theme-toggle";
import { highlight, search, type SearchItem, type SearchItemType } from "@/lib/search";
import type { SearchIndex } from "@/server/services/search";

import { OPEN_PALETTE_EVENT, PREFETCH_PALETTE_EVENT } from "./open";

type EntryKind = SearchItemType | "page" | "action" | "link";

interface Entry {
  id: string;
  kind: EntryKind;
  label: string;
  sub?: string | null;
  snippet?: string | null;
  meta?: string | null;
  /** Internal route or external URL; actions use `run` instead. */
  href?: string;
  external?: boolean;
  run?: () => void | Promise<void>;
  /** Extra words that should find this entry (e.g. "resume" for the CV). */
  keywords?: string;
}

const PAGES: Entry[] = [
  { id: "p-home", kind: "page", label: "Home", href: "/" },
  {
    id: "p-work",
    kind: "page",
    label: "Work",
    href: "/work",
    keywords: "projects case studies",
  },
  { id: "p-research", kind: "page", label: "Research", href: "/research" },
  {
    id: "p-writing",
    kind: "page",
    label: "Writing",
    href: "/writing",
    keywords: "articles essays blog",
  },
  { id: "p-now", kind: "page", label: "Now", href: "/now" },
  { id: "p-about", kind: "page", label: "About", href: "/about", keywords: "bio" },
  {
    id: "p-contact",
    kind: "page",
    label: "Contact",
    href: "/contact",
    keywords: "hire email message",
  },
];

const KIND_LABEL: Record<EntryKind, string> = {
  page: "Page",
  work: "Work",
  research: "Research",
  writing: "Writing",
  action: "Action",
  link: "Link",
};

// Fetched once per visit, the first time the palette opens (or is hovered).
let indexPromise: Promise<SearchIndex> | null = null;
function loadIndex(): Promise<SearchIndex> {
  indexPromise ??= fetch("/api/search")
    .then((r) => {
      if (!r.ok) throw new Error(`search index ${r.status}`);
      return r.json() as Promise<SearchIndex>;
    })
    .catch((err) => {
      indexPromise = null; // let the next open retry
      throw err;
    });
  return indexPromise;
}

function isEditable(el: EventTarget | null): boolean {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="text-text bg-accent-purple/25 rounded-[2px]">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function KindIcon({ kind }: { kind: EntryKind }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4 shrink-0",
  };
  switch (kind) {
    case "work":
      return (
        <svg {...common}>
          <path d="M10 2.5l7 3.5v8l-7 3.5-7-3.5V6z" />
          <path d="M3 6l7 3.5L17 6M10 9.5v8" />
        </svg>
      );
    case "research":
      return (
        <svg {...common}>
          <path d="M8 2.5h4M8.5 2.5v5L4 16a1 1 0 00.9 1.5h10.2A1 1 0 0016 16l-4.5-8.5v-5" />
        </svg>
      );
    case "writing":
      return (
        <svg {...common}>
          <path d="M13.5 3.5l3 3L7 16H4v-3z" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M8 12l4-4M7 6h7v7" />
        </svg>
      );
    case "action":
      return (
        <svg {...common}>
          <path d="M11 2.5L4.5 11H10l-1 6.5L15.5 9H10z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M11.5 2.5H5.5a1 1 0 00-1 1v13a1 1 0 001 1h9a1 1 0 001-1v-10z" />
          <path d="M11.5 2.5v4h4" />
        </svg>
      );
  }
}

/**
 * Site-wide command palette: ⌘K / Ctrl+K or "/" (or the nav search button).
 * Searches every published project, research piece and article (titles,
 * summaries, tags and body text) plus pages and quick actions. Keyboard
 * first, but fully usable by touch and mouse. Implements the ARIA combobox
 * pattern: focus stays in the input, the active option is announced via
 * aria-activedescendant.
 */
export function CommandPalette() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith("/admin");
  const router = useRouter();
  // The page the palette was opened on: navigating away closes it without
  // an effect (it simply no longer matches the current path).
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const baseId = useId();

  const fetchIndex = useCallback(() => {
    if (index) return;
    setStatus("loading");
    loadIndex().then(
      (data) => {
        setIndex(data);
        setStatus("idle");
      },
      () => setStatus("error"),
    );
  }, [index]);

  const show = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    setToast(null);
    setOpenOn(pathname);
    fetchIndex();
  }, [fetchIndex, pathname]);

  const close = useCallback(() => {
    setOpenOn(null);
    returnFocus.current?.focus?.({ preventScroll: true });
  }, []);

  // Global shortcuts and the open/prefetch events.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else show();
      } else if (
        e.key === "/" &&
        !open &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isEditable(e.target)
      ) {
        e.preventDefault();
        show();
      }
    };
    const onPrefetch = () => void loadIndex().catch(() => {});
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, show);
    window.addEventListener(PREFETCH_PALETTE_EVENT, onPrefetch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, show);
      window.removeEventListener(PREFETCH_PALETTE_EVENT, onPrefetch);
    };
  }, [enabled, open, show, close]);

  // While open: lock page scroll (native and Lenis), focus the input.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent(SCROLL_LOCK_EVENT, { detail: true }));
    inputRef.current?.focus();
    return () => {
      root.style.overflow = prev;
      window.dispatchEvent(new CustomEvent(SCROLL_LOCK_EVENT, { detail: false }));
    };
  }, [open]);

  const actions = useMemo<Entry[]>(() => {
    const list: Entry[] = [
      {
        id: "a-theme",
        kind: "action",
        label: "Switch theme",
        sub: "Light or dark",
        keywords: "dark light mode colour color appearance",
        run: () => switchTheme(),
      },
    ];
    if (index?.links.cv) {
      list.push({
        id: "a-cv",
        kind: "action",
        label: "Download CV",
        sub: "PDF",
        keywords: "resume résumé cv pdf",
        href: "/cv?download=1",
        external: true,
      });
    }
    const email = index?.links.email;
    if (email) {
      list.push({
        id: "a-email",
        kind: "action",
        label: "Copy email address",
        sub: email,
        keywords: "email mail contact",
        run: async () => {
          try {
            await navigator.clipboard.writeText(email);
            setToast("Email copied to clipboard");
          } catch {
            window.location.href = `mailto:${email}`;
          }
        },
      });
    }
    for (const s of index?.links.socials ?? []) {
      list.push({
        id: `l-${s.label}`,
        kind: "link",
        label: s.label,
        sub: s.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
        href: s.href,
        external: true,
        keywords: "social profile",
      });
    }
    return list;
  }, [index]);

  // What the list shows: content hits first, then matching pages/actions;
  // with no query, pages and actions.
  const groups = useMemo<{ title: string; entries: Entry[] }[]>(() => {
    const q = query.trim();
    if (!q) {
      return [
        { title: "Pages", entries: PAGES },
        { title: "Actions", entries: actions },
      ];
    }
    const contentHits: Entry[] = search(index?.items ?? [], q, 12).map(
      ({ item, snippet }: { item: SearchItem; snippet: string | null }) => ({
        id: `c-${item.href}`,
        kind: item.type,
        label: item.title,
        sub: item.summary,
        snippet,
        meta: item.meta,
        href: item.href,
      }),
    );
    const asItems = [...PAGES, ...actions].map((e) => ({
      type: "work" as const,
      title: e.label,
      summary: e.sub ?? "",
      href: e.id,
      meta: null,
      tags: [],
      body: e.keywords ?? "",
    }));
    const byId = new Map([...PAGES, ...actions].map((e) => [e.id, e]));
    const navHits = search(asItems, q, 6).map((h) => byId.get(h.item.href)!);
    return [
      { title: "Results", entries: contentHits },
      { title: "Pages & actions", entries: navHits },
    ].filter((g) => g.entries.length > 0);
  }, [query, index, actions]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));
  const activeEntry = flat[activeIndex];
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // Keep the active option in view when moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${baseId}-opt-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, baseId]);

  async function runEntry(entry: Entry, newTab = false) {
    if (entry.run) {
      if (entry.id === "a-email") {
        await entry.run();
        setTimeout(close, 900);
        return;
      }
      close();
      // Let the dialog unmount first so the theme transition captures the page.
      requestAnimationFrame(() => void entry.run?.());
      return;
    }
    if (!entry.href) return;
    close();
    if (entry.external || newTab) {
      if (entry.href.startsWith("/cv")) window.location.href = entry.href;
      else window.open(entry.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(entry.href);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      setActive((activeIndex + 1) % Math.max(flat.length, 1));
    } else if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      setActive((activeIndex - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === "Home" && flat.length) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && flat.length) {
      e.preventDefault();
      setActive(flat.length - 1);
    } else if (e.key === "Enter" && activeEntry) {
      e.preventDefault();
      void runEntry(activeEntry, e.metaKey || e.ctrlKey);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // Focus stays in the input (the list is navigated with arrows).
      e.preventDefault();
    }
  }

  if (!enabled || !open) return null;

  const q = query.trim();
  let n = -1;
  // Only rendered on the client (after opening), so reading navigator is safe.
  const mod = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
    ? "⌘"
    : "Ctrl";

  return (
    <div
      data-lenis-prevent
      className="cmdk-overlay fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Backdrop: a click or tap outside the panel closes the palette. */}
      <div
        aria-hidden="true"
        onMouseDown={(e) => {
          // Keep the browser from moving focus to <body> after we restore it.
          e.preventDefault();
          close();
        }}
        className="bg-bg/70 absolute inset-0 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the site"
        className="cmdk-panel rounded-panel border-border bg-surface relative flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden border shadow-2xl shadow-black/30"
      >
        <div className="border-border flex items-center gap-3 border-b px-5">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="text-text-muted h-5 w-5 shrink-0"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13 13l4 4" />
          </svg>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${baseId}-list`}
            aria-activedescendant={activeEntry ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            aria-label="Search work, research, writing and pages"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search work, research, writing…"
            className="text-text placeholder:text-text-muted/70 h-14 min-w-0 flex-1 bg-transparent font-sans text-base outline-none sm:h-16 sm:text-lg"
          />
          <button
            type="button"
            onClick={close}
            className="border-border text-text-muted hover:text-text rounded-md border px-2 py-1 font-mono text-[11px] transition-colors"
          >
            <span className="sr-only">Close search</span>
            <span aria-hidden="true">Esc</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {status === "loading" && q && !index ? (
            <p className="text-text-muted px-3 py-6 font-sans text-sm">Loading…</p>
          ) : null}
          {status === "error" && !index ? (
            <p className="text-text-muted px-3 py-6 font-sans text-sm">
              Search is unavailable right now. Pages and actions still work.
            </p>
          ) : null}
          {q && index && flat.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-text font-sans text-sm">
                Nothing matches &ldquo;{q}&rdquo;.
              </p>
              <p className="text-text-muted mt-1 font-serif text-sm">
                Try a broader word, or{" "}
                <button
                  type="button"
                  onClick={() => runEntry(PAGES.find((p) => p.id === "p-contact")!)}
                  className="text-text underline underline-offset-4"
                >
                  ask me directly
                </button>
                .
              </p>
            </div>
          ) : null}

          <ul id={`${baseId}-list`} role="listbox" aria-label="Results" ref={listRef}>
            {groups.map((group) => (
              <li key={group.title} role="presentation" className="mb-1 last:mb-0">
                <p
                  role="presentation"
                  className="text-text-muted px-3 pt-3 pb-1.5 font-mono text-[10px] tracking-[0.18em] uppercase"
                >
                  {group.title}
                </p>
                <ul role="presentation">
                  {group.entries.map((entry) => {
                    n += 1;
                    const i = n;
                    const selected = i === activeIndex;
                    return (
                      <li
                        key={entry.id}
                        id={optionId(i)}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => active !== i && setActive(i)}
                        onClick={(e) => void runEntry(entry, e.metaKey || e.ctrlKey)}
                        className={`relative flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          selected ? "bg-surface-2 text-text" : "text-text-muted"
                        }`}
                      >
                        {selected ? (
                          <span
                            aria-hidden="true"
                            className="bg-accent-purple absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full"
                          />
                        ) : null}
                        <span
                          className={`mt-0.5 ${selected ? "text-accent-purple" : ""}`}
                        >
                          <KindIcon kind={entry.kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-text block truncate font-sans text-sm font-medium">
                            <Highlighted text={entry.label} query={q} />
                            {entry.external && entry.kind === "link" ? (
                              <span aria-hidden="true" className="text-text-muted">
                                {" "}
                                ↗
                              </span>
                            ) : null}
                          </span>
                          {entry.snippet || entry.sub ? (
                            <span className="block truncate font-serif text-[13px]">
                              <Highlighted
                                text={entry.snippet ?? entry.sub ?? ""}
                                query={q}
                              />
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 hidden shrink-0 items-center gap-2 font-mono text-[10px] tracking-wider uppercase sm:flex">
                          {entry.meta ? <span>{entry.meta}</span> : null}
                          {q ? (
                            <span className="border-border rounded border px-1.5 py-0.5">
                              {KIND_LABEL[entry.kind]}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-border text-text-muted hidden items-center justify-between gap-4 border-t px-4 py-2.5 font-mono text-[10px] tracking-wider sm:flex">
          <span className="flex items-center gap-3">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> open
            </span>
            <span>
              <kbd className="font-mono">{mod}↵</kbd> new tab
            </span>
          </span>
          <span aria-live="polite">
            {toast ?? (q ? `${flat.length} result${flat.length === 1 ? "" : "s"}` : "")}
          </span>
        </div>
        {toast ? (
          <p
            role="status"
            className="text-text border-border border-t px-4 py-2.5 font-sans text-xs sm:hidden"
          >
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}
