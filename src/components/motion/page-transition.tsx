/**
 * Wrapper kept on every public page so page-change behaviour has one home.
 * Pages now swap instantly in all browsers (see the root view-transition
 * rule in globals.css), so the headline word reveal plays in full
 * everywhere. Shared-element morphs (cover images) still animate through
 * their own named <ViewTransition>s.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
