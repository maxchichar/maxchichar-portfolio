// The geometric "M": two violet bands crossing into a chevron, with the
// dark legs drawn in currentColor so the mark follows the theme (ink on
// light, paper on dark). Paths are traced from the master artwork.
export const LOGO_VIOLET = "#652bfc";
export const LOGO_VIEWBOX = "0 0 643 511";
export const LOGO_VIOLET_PATHS = [
  "M0 0H102L320 213L542 0H643V511H542V163L309 380L0 77Z",
  "M125 398L214 314L291 390L150 511H125Z",
];
export const LOGO_INK_PATHS = [
  "M0 123L102 223V511H0Z",
  "M325 380L408 303L510 403V511H458Z",
];

export function LogoMark({
  className,
  title,
}: {
  className?: string;
  /** Omit for a decorative mark next to visible text. */
  title?: string;
}) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {LOGO_VIOLET_PATHS.map((d) => (
        <path key={d} d={d} fill={LOGO_VIOLET} />
      ))}
      {LOGO_INK_PATHS.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}
