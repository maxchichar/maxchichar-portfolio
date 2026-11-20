# Frontend, UI/UX and accessibility playbook

"World-class" isn't a color palette or an animation library. It means clarity of information, task completion, perceived speed, accessibility, consistency, trust and maintainable visual systems. Start by measuring real user and business outcomes.

## UI research

Inspect the product's users and tasks, current design tokens, typography, components, content model, screenshots/assets supplied, responsive breakpoints, framework conventions and user complaints. Audit current flows (landing, auth, dashboard, forms, tables, empty states, admin and error pages) before redesigning. Identify the highest-impact usability failure and avoid rewriting unaffected flows.

Use competitor references as **context**, not unlicensed replicas. Seek original design decisions aligned with brand and content. Do not make blanket claims like "premium requires gradients/glass/3D". If the user asks for research-first design, research real needs before pixels.

## Design system

- **Tokens:** color roles, typography scale, 4/8 spacing strategy where suitable, radius, depth/elevation, motion duration, breakpoint and density.
- **Information hierarchy:** one clear primary action, restrained visual emphasis, scannable content, clear labels and honest status.
- **Components:** buttons/links, controls, navigation, menus, dialog, toast, table, upload, skeleton, error, retry, pagination; consistent semantics and keyboard handling.
- **States:** loading, empty, error, partial, offline, unauthorized, pending, success, disabled, validation warning, destructive confirmation.
- **Responsive:** test realistic narrow/large viewports, long copy, text zoom, dynamic content and low-end phones—not only desktop screenshots.
- **Performance:** image size/format, LCP/CLS/INP where relevant, caching, lazy-loading, bundle budgets, no gratuitous animation or heavy dependencies.

## Accessibility verification

Use **WCAG 2.2 AA** as a pragmatic target for most modern web apps unless an applicable rule imposes another target. Check keyboard-only operation, visible focus/not obscured, semantic HTML, accessible names/descriptions, contrast, reduced-motion preference, predictable interaction, logical heading order, errors with actionable help, touch target size, accessible authentication and labeling. Automated axe-style scans help but manual keyboard and assistive technology assessment remain necessary for important flows.

Do not claim WCAG conformance from one automated run. Conformance depends on full applicable success criteria and scoped evaluation.

## Frontend implementation

- Prefer server-side authorization; route guards are UX only.
- Separate server-derived state and local form state; avoid duplicative sources of truth.
- Use proper forms, browser semantics, error boundaries and abortable requests.
- Handle pagination, optimistic update rollback, concurrent edits, stale data and submission duplication.
- Avoid placeholder charts/metrics that appear real; label demonstrations.
- For admin, require clear audit, access boundaries, destructive-action confirmations and data-export privacy.

## UI release gate

A feature passes when real task flows are usable (including unhappy paths) on relevant devices, keyboard works, critical content isn't inaccessible, and performance regressions are checked. Screenshots alone are not behavioral verification. Include visual regression snapshots only when changes justify their maintenance burden.
