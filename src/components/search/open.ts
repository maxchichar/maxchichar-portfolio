/** Opens the command palette from anywhere (e.g. the nav search button). */
export const OPEN_PALETTE_EVENT = "open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

/** Warms the search index (e.g. on hover) so the first open is instant. */
export const PREFETCH_PALETTE_EVENT = "prefetch-command-palette";

export function prefetchCommandPalette() {
  window.dispatchEvent(new Event(PREFETCH_PALETTE_EVENT));
}
