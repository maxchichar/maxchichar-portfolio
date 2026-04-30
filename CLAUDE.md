# CLAUDE.md — MAXCHICHAR Portfolio Master Brief

> This file is the source of truth for every decision Claude Code makes on this project.
> Read it fully before touching a single file. Re-read it when in doubt.

---

## 0. Project Identity

**Portfolio owner:** MAXCHICHAR  
**Tagline:** _Not a developer portfolio. A world._  
**Personality:** A designer who codes. A builder who thinks cinematically. Human-first, not AI-generic.  
**The vibe:** If Christopher Nolan and Dieter Rams had a child who grew up on blockchain and sci-fi — this is their portfolio.

---

## 1. The One Rule That Overrides Everything

> **Build like a senior designer who happens to code, not a senior developer who happens to design.**

This means:
- Typography decisions are made before layout decisions
- Every section has an emotional intention, not just a content structure
- Motion exists to guide the eye, not to show off
- The site must feel _authored_, not _generated_

---

## 2. Tech Stack (Non-Negotiable)

```
Framework:      React 18 + Vite
Styling:        Tailwind CSS v3 (with custom config extension)
Animation:      Framer Motion (primary) + GSAP (complex sequences)
3D/Particles:   Three.js (galaxy background, palace entrance)
Smooth Scroll:  Lenis
Audio:          Howler.js (music + SFX) + Web Speech API (TTS)
i18n:           react-i18next (7 languages)
Icons:          Lucide React
Fonts:          See §5
```

**DO NOT use:**
- `create-react-app` (use Vite)
- `styled-components` or `emotion` (use Tailwind)
- `jQuery` (ever)
- Generic icon packs other than Lucide

---

## 3. File & Folder Structure

```
/src
  /components
    /gate          ← Terminal, loading bar, palace door, language menu
    /hero          ← Avatar on throne, TTS greeting, galaxy bg
    /nav           ← Sticky nav, magnetic items, blur header
    /sections
      About.jsx
      Skills.jsx
      Projects.jsx      ← Hierarchy layout
      Blockchain.jsx    ← Block animation + hash reveal
      AIArmy.jsx        ← Mini agent formation
      Archive.jsx
      Contact.jsx
    /ui             ← Shared: Button, Card, Cursor, ParticleField
  /hooks            ← useAudio, useCursor, useLanguage, useScrollProgress
  /lib              ← i18n config, audio registry, animation presets
  /assets           ← Fonts, avatar image, audio files (MP3/OGG)
  App.jsx
  main.jsx
  index.css         ← Tailwind base + custom @keyframes
/public
  /audio            ← terminal-beep.mp3, orchestral-swell.mp3, door-slam.mp3, ambient-beat.mp3
/CLAUDE.md          ← This file
/SKILLS.md          ← Animation & component patterns
/CONTENT.md         ← All copy, translations, project data
```

---

## 4. The Entrance Sequence (Build This First — It Sets the Tone)

### Phase 1 — Terminal Boot
- Full black screen
- Purple (`#a855f7`) monospace cursor blinks
- Text types character-by-character: `> INITIALIZING MAXCHICHAR.SYSTEM...`
- Each keystroke plays `terminal-beep.mp3` (short, mechanical)
- Background ambient beat starts at 20% volume
- After typing: `[████████████] 100%` fills across with hash symbols
- Progress ticks from 0→100%, each tick plays a subtle tick sound

### Phase 2 — Palace Door (Gate)
- Massive white double-doors fill the screen (think palace scale, not house scale)
- Purple glowing circuitry traces the door edges
- Giant `X` symbol split down the center seam
- Doors swing open outward with cinematic depth (GSAP perspective transform)
- Orchestral swell peaks at door-open moment
- Language selection menu appears (EN, ES, FR, DE, JP, CN, RU)

### Phase 3 — Hero / Throne Room
- Galaxy particle field fades in as background (Three.js canvas behind everything)
- Avatar appears seated on a throne — centered, cinematic crop
- TTS greeting fires in selected language
- Typewriter text accompanies TTS: `"Welcome to the MAXCHICHAR archive. I am your guide."`

**State machine:**
```
BOOT → TERMINAL_TYPING → LOADING_BAR → DOOR_LOCKED → LANGUAGE_SELECT → DOOR_OPENING → THRONE_REVEAL → PORTFOLIO
```

---

## 5. Typography System

```css
/* Display / Hero headings */
font-family: 'Bebas Neue', 'Impact', display;

/* Body / UI text */
font-family: 'DM Sans', sans-serif;

/* Code / Terminal / Blockchain hashes */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* Accent / Signature moments */
font-family: 'Playfair Display', serif;
```

Load all from Google Fonts. Self-host for production.

**Type scale (Tailwind custom):**
```
display-2xl: 7rem / tight
display-xl:  5rem / tight
display-lg:  3.5rem / tight
body-lg:     1.125rem / relaxed
body-sm:     0.875rem / normal
mono-sm:     0.75rem / normal (terminals, hashes)
```

---

## 6. Color Tokens (Tailwind Config)

```js
// tailwind.config.js — extend colors
colors: {
  void:    '#020202',   // main background
  purple:  '#a855f7',   // primary accent
  'purple-dim': '#7c3aed',
  zinc:    '#71717a',   // secondary text
  'zinc-light': '#d4d4d8',
  white:   '#fafafa',
  ghost:   '#ffffff08', // glass panels
}
```

**Color rules:**
- Backgrounds are always void-adjacent (near black)
- Primary interactive elements are purple
- Text hierarchy: white → zinc-light → zinc
- NEVER use blue, red, or green as accents on this site
- Glows are purple only

---

## 7. Section-by-Section Spec

### 7.1 Hero / Throne
- Full viewport height
- Galaxy particle canvas (Three.js) fills 100% behind everything — minimal, 60-80 particles, slow drift
- Avatar image centered, slight vignette crop
- Name `MAXCHICHAR` in Bebas Neue, massive
- Subtitle in DM Sans, small, zinc color
- Scroll indicator: animated mouse icon + `SCROLL TO ENTER`

### 7.2 About
- Two-column: text left, visual element right
- Visual element: an animated geometric shape that reacts to scroll position
- Text reveals word-by-word on scroll intersection
- NO generic "I am a passionate developer" copy — see CONTENT.md

### 7.3 Skills
- NOT a progress bar chart (never)
- Displayed as 3D tilt cards in a flowing, non-grid layout
- Each card: skill name, icon, years, a one-line descriptor
- Cards respond to mouse with perspective tilt (Framer Motion `useMotionValue`)
- Glare effect follows cursor across card surface

### 7.4 Projects (Hierarchy Layout — Critical)
```
┌─────────────────────────────────────────────────────┐
│  FLAGSHIP PROJECT                                    │
│  Full-width section: screenshot hero, description,  │
│  tech stack chips, live link + GitHub link          │
└─────────────────────────────────────────────────────┘

          THE REST — Leaderboard style
          ─────────────────────────────
          #1  Project Name      Stack   →
          #2  Project Name      Stack   →
          #3  Project Name      Stack   →
```
- Flagship gets its own cinematic reveal on scroll
- Leaderboard rows use `counter()` CSS for rank numbers
- Hover on leaderboard row: background sweeps purple left-to-right
- NO card grids. NO masonry. This is intentional hierarchy.

### 7.5 Blockchain Section
1. User scrolls into section
2. Individual floating hash strings appear: `0xf3a...`, `sha256:...`
3. Blocks (styled rectangles) animate in from edges
4. Blocks connect with glowing chain links
5. Title scrambles: `#@!$%^& → BLOCKCHAIN` using text shuffle animation
6. Clicking a block opens an inline panel showing mock transaction data

### 7.6 AI Agents Section
1. Section title: `MY AI ARMY` — bold, centered
2. Grid of mini avatar figures (SVG/CSS characters)
3. Each agent wears a badge with a tool name: GPT-4, Claude, Midjourney, etc.
4. On scroll-enter: agents march/walk into formation (GSAP stagger)
5. Hover on agent: agent "activates" — glows purple, shows capability tooltip
6. Optional: agents react to mouse position (look toward cursor)

### 7.7 Contact
- Minimal. Single column.
- Three social links: GitHub, X (Twitter), LinkedIn
- Each link: icon + handle + a one-line descriptor
- Hover: icon floats up, underline grows from center
- Email CTA button: glowing purple, magnetic pull effect

---

## 8. Navigation

- Sticky header, shrinks on scroll
- Frosted glass blur background (`backdrop-filter: blur(20px)`)
- Logo left: `MX` monogram in Bebas Neue
- Links right: About · Work · Blockchain · AI · Contact
- Active link: animated underline grows from center
- Mobile: hamburger → full-screen slide-in menu
- All nav items have magnetic pull effect (cursor bends toward them)

---

## 9. Global Animations

### Must-haves (non-negotiable):
- [ ] Custom cursor: small glowing dot + trailing ring with spring physics
- [ ] Galaxy particle background (Three.js canvas, always present but subtle)
- [ ] Film grain overlay (CSS pseudo-element, 3% opacity, animated)
- [ ] Scroll progress bar (thin purple line at top of viewport)
- [ ] Section reveal: every section fades + slides up on intersection

### On hover (all interactive elements):
- Scale: `1.02–1.05x` (never more)
- Glow: `box-shadow: 0 0 20px #a855f760`
- Transition: `cubic-bezier(0.4, 0, 0.2, 1)` always

### Timing constants (use these, don't invent new ones):
```js
const TIMING = {
  instant:  150,   // state changes
  fast:     300,   // hover transitions
  standard: 500,   // element reveals
  slow:     800,   // section transitions
  cinematic: 1200, // gate, door, throne
}
```

---

## 10. Audio System

**Files needed (create/source):**
| File | Usage | Duration |
|------|-------|----------|
| `terminal-beep.mp3` | Each typed character | 30ms |
| `tick.mp3` | Loading bar progress tick | 20ms |
| `door-slam.mp3` | Gate close | 1.5s |
| `orchestral-swell.mp3` | Gate open | 4s |
| `ambient-beat.mp3` | Background loop | 60s loop |

**Rules:**
- Ambient beat: 20% volume, always looping when site is open
- All SFX respect the user's mute toggle
- If autoplay is blocked: show status badge `AUDIO BLOCKED — CLICK ANYWHERE`
- Audio toggle: top-right corner, always visible, mute icon (Lucide)

**TTS implementation:**
```js
// After gate opens, speaks in selected language
const speak = (text, lang) => {
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = LANG_MAP[lang]    // e.g. 'fr-FR', 'ja-JP'
  utter.rate = 0.95
  utter.pitch = 0.9
  window.speechSynthesis.speak(utter)
}
```

---

## 11. i18n — 7 Languages

Languages: EN · ES · FR · DE · JP · CN · RU

Manage via `react-i18next`. All strings live in `/src/lib/i18n/[lang].json`.

UI strings to translate: button labels, status messages, nav items, gate greeting.  
Portfolio content (project descriptions, bio) stays in English only.

---

## 12. Performance Rules

- Lazy-load all sections below the fold
- Three.js canvas: max 80 particles, requestAnimationFrame capped at 60fps
- Images: WebP format, max 1200px wide, loading="lazy"
- Audio: preload only the first 3 seconds of ambient track
- Reduce motion: respect `prefers-reduced-motion` — disable all non-essential animations

```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

---

## 13. What NOT to Build

- No hero video background (kills performance)
- No loading spinner (the terminal IS the loader)
- No dark/light mode toggle (it's always dark — this is the aesthetic)
- No cookie banners (no tracking)
- No comment sections
- No generic "hero with gradient blob" layouts
- No progress bars for skills (it's meaningless and cliché)
- No stock photos
- No Lorem Ipsum in final build — use CONTENT.md

---

## 14. Build Order

```
1. Project setup (Vite + Tailwind + dependencies)
2. CONTENT.md → data layer (projects, translations, bio)
3. Global styles (tokens, fonts, film grain, cursor, scroll bar)
4. Entrance sequence (Terminal → Loading → Door → Language → Throne)
5. Navigation
6. Hero section
7. About section
8. Skills section
9. Projects section (hierarchy)
10. Blockchain section
11. AI Army section
12. Contact section
13. Audio system integration
14. i18n integration
15. Performance audit + reduced-motion pass
16. Mobile responsive pass
```

---

_Last updated: project inception. Keep this file in sync as decisions are made._
