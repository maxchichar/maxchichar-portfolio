# BLOG.md — Blog System Spec + Avatar on Throne Guide

---

## PART A — BLOG SYSTEM

### A.1 Philosophy

This is not a Medium clone. It is not a dev.to feed.
It is a personal broadcast channel — the thinking behind the work.

The blog must feel like the rest of the portfolio: dark, cinematic, authored.
Not a white page with black text. Not a navbar with "Latest Posts."

**The vibe:** A transmission log. A captain's journal. Dispatches from the build.

---

### A.2 Where the Blog Lives

```
Route:    /archive
Section:  Accessible from the main nav ("Archive" link)
Layout:   Editorial — NOT a card grid
```

The blog is called **THE ARCHIVE** to match the portfolio's system metaphor.

---

### A.3 Blog Architecture

```
/src
  /pages
    Archive.jsx          ← Blog index (list of posts)
    Post.jsx             ← Single post view
  /content
    /posts
      [slug].md          ← Each post is a markdown file
  /lib
    parsePosts.js        ← Reads markdown files, extracts frontmatter
```

Use **Vite's `import.meta.glob`** to load markdown files at build time.
Use **`gray-matter`** for frontmatter parsing.
Use **`marked`** or **`remark`** for markdown → HTML rendering.

Install:
```bash
npm install gray-matter marked
```

---

### A.4 Post Frontmatter Format

Every `.md` file in `/src/content/posts/` must start with:

```yaml
---
title: "How I Built a DEX in 30 Days"
slug: "how-i-built-a-dex-in-30-days"
date: "2024-11-15"
category: "Blockchain"
excerpt: "The honest account of shipping fast, breaking things, and what I'd do differently."
coverImage: "/src/assets/blog/dex-cover.jpg"
readTime: 8
status: "published"
tags: ["solidity", "defi", "ethereum", "react"]
---

Your post content starts here...
```

**Categories:** Blockchain · Design · AI · Dev · Process · Opinion

---

### A.5 Archive Index Layout (THE ARCHIVE)

```
┌──────────────────────────────────────────────────────┐
│  THE ARCHIVE                         [Category filter]│
│  ─────────────────────────────────────────────────── │
│                                                       │
│  FEATURED POST (most recent)                          │
│  ┌────────────────────────────────────────────────┐  │
│  │  [Cover image — full width, cinematic crop]    │  │
│  │  Category tag                                  │  │
│  │  Post Title — Large, Bebas Neue                │  │
│  │  Excerpt                      Date · Read time │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  OTHER POSTS — editorial list                         │
│  ─────────────────────────────────────────────────── │
│  #  Title                    Category  Date    →      │
│  #  Title                    Category  Date    →      │
│  #  Title                    Category  Date    →      │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Rules:**
- Most recent post = featured (full-width hero treatment)
- All others = numbered editorial list rows (same pattern as Projects leaderboard)
- Category filter: pill buttons that filter the list in-place with Framer Motion layout animation
- NO pagination for now — all posts visible, newest first

---

### A.6 Single Post Layout

```
┌──────────────────────────────────────────────────────┐
│  ← Back to Archive                                    │
│                                                       │
│  [Category]  ·  [Date]  ·  [Read time]               │
│                                                       │
│  POST TITLE                                           │
│  (Bebas Neue, massive)                                │
│                                                       │
│  [Cover image — full width]                           │
│                                                       │
│  ─── Body text starts here ────────────────────────  │
│                                                       │
│  Headings: Bebas Neue                                 │
│  Body: DM Sans, 18px, line-height 1.8                 │
│  Code blocks: JetBrains Mono, dark bg, purple accent  │
│  Blockquotes: left border purple, italic serif        │
│                                                       │
│  [Tags at bottom]                                     │
│  ─────────────────────────────────────────────────── │
│  ← Previous post          Next post →                 │
└──────────────────────────────────────────────────────┘
```

**Post body typography:**
```css
.post-body h1, h2, h3 { font-family: 'Bebas Neue'; color: white; }
.post-body p           { font-family: 'DM Sans'; font-size: 18px; line-height: 1.8; color: #d4d4d8; }
.post-body code        { font-family: 'JetBrains Mono'; background: #ffffff0a; color: #a855f7; padding: 2px 6px; border-radius: 3px; }
.post-body pre         { background: #0a0a0a; border: 1px solid #a855f720; border-radius: 6px; padding: 24px; overflow-x: auto; }
.post-body blockquote  { border-left: 3px solid #a855f7; padding-left: 24px; font-style: italic; color: #71717a; }
.post-body a           { color: #a855f7; border-bottom: 1px solid #a855f740; }
.post-body img         { width: 100%; border-radius: 4px; margin: 32px 0; }
```

---

### A.7 Animations (Blog-Specific)

**Archive index:**
- Featured post: fade + scale in on mount
- List rows: staggered slide-up on mount (Framer Motion)
- Category filter: layout animation when list reorders (Framer Motion `layout` prop)
- Hover on row: purple sweep left-to-right (same as Projects leaderboard)

**Single post:**
- Enter transition: full-page slide up from bottom (Framer Motion AnimatePresence)
- Reading progress: thin purple bar at top fills as you scroll through the post
- Code blocks: syntax highlight with subtle purple tones (no external lib — CSS only)
- Back button: slide left on click

---

### A.8 Claude Code Prompt for Blog

Add this as **Prompt 13** in your build sequence:

```
Read BLOG.md fully. 

Build the complete blog system:
1. Install gray-matter and marked
2. Create /src/content/posts/ and add one sample post using the frontmatter 
   format from BLOG.md §A.4
3. Create parsePosts.js using Vite import.meta.glob to load all markdown files
4. Build Archive.jsx using the layout from BLOG.md §A.5 — featured post hero, 
   editorial list rows, category filter pills with Framer Motion layout animation
5. Build Post.jsx using the layout from BLOG.md §A.6 — reading progress bar, 
   post body typography from BLOG.md §A.6, previous/next navigation
6. Add /archive route to React Router
7. Add "Archive" link to the navigation (between AI and Contact)
8. Apply all animations from BLOG.md §A.7

Use the color tokens and font system from CLAUDE.md. 
Pull post data from CONTENT.md §7 for the initial posts.
```

---

---

## PART B — HOW TO GIVE CLAUDE CODE YOUR AVATAR ON A THRONE

There are three options depending on your situation. Pick one.

---

### Option 1 — You Have a Good Photo of Yourself (Recommended)

**What you do:**
1. Take or find your best photo — clear face, good lighting, ideally upper-body or full-body
2. Name it `avatar-original.jpg`
3. Drop it into `/src/assets/`

**Then give Claude Code this prompt:**

```
I've added my photo at /src/assets/avatar-original.jpg.

Build the throne hero component:
- Create a cinematic hero composite: my photo layered over a throne/throne room aesthetic
- Use CSS to achieve this: my photo as the main centered element, 
  a dark gothic throne SVG or CSS shape behind/around me
- Add purple rim lighting effect around my silhouette using CSS box-shadow and 
  a radial gradient: radial-gradient(ellipse at 50% 100%, #a855f740 0%, transparent 70%)
- Add a subtle vignette: dark edges, bright center
- The throne "seat" should be implied by: ornate CSS border elements below me, 
  armrests suggested by symmetric decorative shapes on either side
- Galaxy particle canvas renders behind everything
- My face/body is the focal point — the throne frames me, it doesn't bury me
- Final output: a component at /src/components/hero/ThroneHero.jsx
```

---

### Option 2 — You Want a Real AI-Generated Throne Image

**Step 1 — Generate the throne background:**

Go to one of these tools and use this prompt:

**Midjourney prompt:**
```
gothic sci-fi throne room, massive ornate throne, deep black and dark purple, 
glowing purple circuitry on throne armrests, cinematic lighting from above, 
empty throne centered, dramatic perspective, photorealistic, 8K, 
no people, dark atmosphere, --ar 9:16 --style raw
```

**Adobe Firefly / DALL·E prompt:**
```
A massive gothic-futuristic throne, ornate dark metal, 
glowing purple accents and circuitry details, centered in frame, 
dramatic top-down lighting, cinematic, photorealistic, dark background, 
no people in the scene, vertical orientation
```

**Step 2 — Remove your photo background:**
- Go to **remove.bg** (free)
- Upload your photo — it removes the background in seconds
- Download the PNG with transparent background

**Step 3 — Add both files to your project:**
```
/src/assets/throne-bg.jpg     ← the AI-generated throne
/src/assets/avatar-cutout.png ← your photo, background removed
```

**Step 4 — Give Claude Code this prompt:**
```
I've added two files:
- /src/assets/throne-bg.jpg  (throne room background)
- /src/assets/avatar-cutout.png  (my photo, background already removed)

Build ThroneHero.jsx:
- throne-bg.jpg fills the full viewport as background (object-fit: cover)
- avatar-cutout.png is positioned centered, bottom-aligned, 
  as if I am sitting IN the throne (z-index above bg, below UI text)
- Add purple rim light glow around my cutout: 
  filter: drop-shadow(0 0 30px #a855f780)
- Add vignette overlay: radial-gradient dark edges
- My name MAXCHICHAR renders above in Bebas Neue, massive
- Subtitle and scroll indicator below
- Galaxy particle canvas is the deepest layer (z-index: 0)
- Layer order (back to front): Galaxy → Throne BG → Vignette → Avatar → Text UI
```

---

### Option 3 — Pure CSS Throne (No Images Needed)

If you don't have a photo yet or want to ship fast:

```
Build ThroneHero.jsx with a pure CSS/SVG throne:

- Dark full-viewport hero
- Center: a CSS-drawn throne shape (tall back, wide seat, armrests) 
  using border and box-shadow, styled in dark zinc with purple glow edges
- A glowing orb/silhouette placeholder where the avatar will go 
  (circular, purple radial glow, pulsing animation)
- Text: "MAXCHICHAR" in Bebas Neue, centered above
- Subtitle beneath
- Galaxy particles behind everything
- When I'm ready to add my real photo, I'll drop it at /src/assets/avatar.jpg 
  and you replace the silhouette placeholder with the real image
```

---

### B.4 The CSS Rim Light Effect (Copy This Directly)

This makes any photo look like it's lit from behind with purple light:

```css
.avatar-throne {
  position: relative;
  filter: drop-shadow(0 0 40px #a855f760) 
          drop-shadow(0 0 80px #a855f730);
}

.avatar-throne::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 60%;
  background: radial-gradient(ellipse at 50% 100%, #a855f740 0%, transparent 70%);
  pointer-events: none;
}
```

---

### B.5 Quick File Checklist Before Running the Hero Prompt

```
[ ] /src/assets/avatar.jpg           OR
[ ] /src/assets/avatar-cutout.png    (background removed)
[ ] /src/assets/throne-bg.jpg        (if using Option 2)
[ ] CONTENT.md §1 filled in          (your name, tagline)
[ ] CONTENT.md §2 filled in          (your bio)
```

---

_The throne scene is the first human thing the visitor sees after the gate opens._
_Make it count. Use a real photo. The cutout + throne composite is worth the 5 minutes._
