import { ViewTransition } from "react";

/**
 * Wraps a page's content so route changes animate (old page lifts away,
 * new one rises in — see `.page` rules in globals.css). Must live in each
 * page, not a layout: layouts persist across navigations, so their
 * enter/exit never fire.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      {children}
    </ViewTransition>
  );
}
