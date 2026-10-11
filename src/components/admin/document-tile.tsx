/** Placeholder for non-image media (a PDF) where a thumbnail would go. */
export function DocumentTile({ label = "PDF" }: { label?: string }) {
  return (
    <div className="text-text-muted absolute inset-0 flex flex-col items-center justify-center gap-2">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-9 w-9"
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
      <span className="font-mono text-[11px] tracking-[0.18em]">{label}</span>
    </div>
  );
}
