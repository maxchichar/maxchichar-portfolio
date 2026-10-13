"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

import { MediaPicker, type MediaPickerItem } from "@/components/admin/media-picker";
import {
  hasRichHtml,
  INSERT_MARKDOWN_EVENT,
  looksLikeMarkdown,
  markdownToEditorHtml,
  type InsertMarkdownDetail,
} from "@/lib/markdown-paste";
import { safeHref } from "@/lib/rich-text";

/**
 * Rich-text field for the admin editors. Edits the same Tiptap JSON the
 * database already stores, and posts it through a hidden input named
 * `name` (parsed server-side by parseRichTextField). Public rendering is
 * allow-listed separately, so nothing typed here is trusted as markup.
 *
 * Pasting Markdown (from a notes app, an AI chat, a .md file) turns it into
 * real headings, emphasis, lists and dividers instead of literal symbols.
 */
export function RichTextEditor({
  name,
  initialContent,
  placeholder = "Start writing…",
  libraryMedia = [],
  minHeight = "min-h-48",
  label,
}: {
  name: string;
  initialContent: unknown;
  placeholder?: string;
  libraryMedia?: MediaPickerItem[];
  minHeight?: string;
  label?: string;
}) {
  const [json, setJson] = useState(() => JSON.stringify(initialContent ?? ""));
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => safeHref(url) !== null,
        },
      }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: isDoc(initialContent) ? initialContent : "",
    editorProps: {
      attributes: {
        class: `rich-text max-w-none px-5 py-4 outline-none ${minHeight}`,
        ...(label ? { "aria-label": label } : {}),
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const html = event.clipboardData?.getData("text/html") ?? "";
        if (!editorRef.current || hasRichHtml(html) || !looksLikeMarkdown(text)) {
          return false; // the editor's normal paste
        }
        editorRef.current.chain().focus().insertContent(markdownToEditorHtml(text)).run();
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      setJson(JSON.stringify(editor.getJSON()));
      // Let form-level listeners (e.g. UnsavedGuard) see editor changes.
      wrapperRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    },
  });

  useEffect(() => {
    editorRef.current = editor;
    if (!editor) return;
    // Another field can hand Markdown over (e.g. moving an over-long excerpt
    // into the body): it replaces an empty body, or is added at the end.
    const onInsert = (e: Event) => {
      const { target, markdown } = (e as CustomEvent<InsertMarkdownDetail>).detail;
      if (target !== name || !markdown.trim()) return;
      const html = markdownToEditorHtml(markdown);
      if (editor.isEmpty) editor.chain().setContent(html).focus("start").run();
      else editor.chain().focus("end").insertContent(html).run();
      wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener(INSERT_MARKDOWN_EVENT, onInsert);
    return () => window.removeEventListener(INSERT_MARKDOWN_EVENT, onInsert);
  }, [editor, name]);

  return (
    <div
      ref={wrapperRef}
      className="rounded-card border-border bg-bg focus-within:border-accent overflow-hidden border transition-colors"
    >
      <input type="hidden" name={name} value={json} />
      {editor ? <Toolbar editor={editor} onImage={() => setPickerOpen(true)} /> : null}
      <EditorContent editor={editor} />
      {editor ? <Footer editor={editor} /> : <div className={minHeight} />}
      {pickerOpen && editor ? (
        <MediaPicker
          media={libraryMedia}
          currentMediaId={null}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            editor
              .chain()
              .focus()
              .setImage({ src: item.storageUrl, alt: item.filename })
              .run();
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function isDoc(value: unknown): value is JSONContent {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc"
  );
}

function Footer({ editor }: { editor: Editor }) {
  const words = useEditorState({
    editor,
    selector: ({ editor }) => editor.getText().trim().split(/\s+/).filter(Boolean).length,
  });
  return (
    <div className="border-border text-text-muted flex justify-end border-t px-4 py-1.5 font-mono text-[11px]">
      {words} {words === 1 ? "word" : "words"}
    </div>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      link: editor.isActive("link"),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      quote: editor.isActive("blockquote"),
      codeBlock: editor.isActive("codeBlock"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…, mailto:, or /path)", previous ?? "");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = safeHref(url.trim());
    if (!href) {
      window.alert("Only http(s), mailto: and site-relative links are allowed.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const c = () => editor.chain().focus();
  const groups: {
    label: string;
    content: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    run: () => void;
  }[][] = [
    [
      {
        label: "Heading",
        content: "H2",
        active: state.h2,
        run: () => c().toggleHeading({ level: 2 }).run(),
      },
      {
        label: "Subheading",
        content: "H3",
        active: state.h3,
        run: () => c().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        label: "Bold",
        content: <b>B</b>,
        active: state.bold,
        run: () => c().toggleBold().run(),
      },
      {
        label: "Italic",
        content: <i className="font-serif">I</i>,
        active: state.italic,
        run: () => c().toggleItalic().run(),
      },
      {
        label: "Strikethrough",
        content: <s>S</s>,
        active: state.strike,
        run: () => c().toggleStrike().run(),
      },
      {
        label: "Inline code",
        content: "</>",
        active: state.code,
        run: () => c().toggleCode().run(),
      },
      { label: "Link", content: "↗", active: state.link, run: setLink },
    ],
    [
      {
        label: "Bulleted list",
        content: "•≡",
        active: state.bullet,
        run: () => c().toggleBulletList().run(),
      },
      {
        label: "Numbered list",
        content: "1≡",
        active: state.ordered,
        run: () => c().toggleOrderedList().run(),
      },
      {
        label: "Quote",
        content: "❝",
        active: state.quote,
        run: () => c().toggleBlockquote().run(),
      },
      {
        label: "Code block",
        content: "{ }",
        active: state.codeBlock,
        run: () => c().toggleCodeBlock().run(),
      },
      { label: "Divider", content: "―", run: () => c().setHorizontalRule().run() },
      { label: "Image from library", content: "▣", run: onImage },
    ],
    [
      {
        label: "Undo",
        content: "↶",
        disabled: !state.canUndo,
        run: () => c().undo().run(),
      },
      {
        label: "Redo",
        content: "↷",
        disabled: !state.canRedo,
        run: () => c().redo().run(),
      },
    ],
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="border-border bg-surface flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
    >
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 ? (
            <span aria-hidden="true" className="bg-border mx-1.5 h-5 w-px" />
          ) : null}
          {group.map((b) => (
            <button
              key={b.label}
              type="button"
              title={b.label}
              aria-label={b.label}
              aria-pressed={b.active ?? undefined}
              disabled={b.disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.run}
              className={`rounded-badge flex h-8 min-w-8 items-center justify-center px-2 font-mono text-xs transition-colors disabled:opacity-30 ${
                b.active
                  ? "bg-text text-bg"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              {b.content}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
