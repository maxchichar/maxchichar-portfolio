# CONTENT.md — MAXCHICHAR Portfolio Content

> This is YOUR file. Fill in every section marked with [ ].
> Claude Code reads this to populate the entire site with real content.
> Never leave placeholder text in the final build.

---

## 1. Identity

```
Full name:        CHIBUEZE CHARLES MAXWELL
Display name:     MAXCHICHAR
Tagline:          [ "Self-Taught. Serial Builder. Blockchain & AI." ]
Location:         [ "Lagos, Nigeria" ]
Availability:     [ "Open to work  ·  Currently building" ]
```

## 2. Bio (About Section)

Write 2–3 short paragraphs. First person. No "passionate developer" clichés.
Sound like a human who has done real things, not a resume.

```
Paragraph 1 (who you are):
[ No CS degree. No bootcamp scholarship. No mentor who handed me a roadmap.
I taught myself to build software from scratch because I couldn't find a
faster way to make the ideas in my head real. I've shipped products
Tovo, Nkesa, Recenteris, and each one made me a sharper developer than
any classroom would have. Right now I'm at learn2earn.ng going deep on Go,
Rust, JavaScript, full-stack development, and a six-month Blockchain
specialisation. Not for a certificate. To build things that don't exist yet. ]

Paragraph 2 (what you build / your angle):
[ My angle is systems specifically the ones that control how money moves
and who gets access to what. I build at the intersection of blockchain and
AI because that's where the most interesting bets on the future of finance
are being placed. I'm AI-native by default: not bolting it on after the
fact, but designing around it from the first line of code. The stack
changes. The goal doesn't make the system more honest, more open, and
harder to exploit. ]

Paragraph 3 (what drives you / the why):
[ I want to change how currency works. That's not a pitch, it's the actual
reason I'm at the terminal at 2am when I should be asleep. I'm wired for
problems that feel unsolvable. They don't drain me, they focus me. Every
project I ship is one step closer to the infrastructure I'm trying to
build. I'm still early. I know that. But being early is exactly where
I want to be. ]
```

---

## 3. Skills

List your actual skills. Add or remove rows.

| Skill | Category | Years | One-line descriptor |
|-------|----------|-------|---------------------|
| [ e.g. Figma ] | Design | [ 3 ] | [ Where every idea starts ] |
| [ e.g. React & html & css & js ] | Frontend | [ ] | [ ] |
| [ e.g. Node.js & Go ] | Backend | [ ] | [ ] |
| [ e.g. Solidity & Rust] | Blockchain | [ ] | [ ] |
| [ e.g. Python ] | AI/ML | [ ] | [ ] |
| [ Add more ] | | | |

---

## 4. Projects

### 4.1 Flagship Project (gets its own full section)

```
Name:           [MAXCHICHAR LIVE RECEIPT]
Tagline:        [ Turn static receipts into a premium, interactive presentation layer people can actually read and explore. ]
Description:    [ MAXCHICHAR LIVE RECEIPT is a web application that transforms ordinary receipts and proof-of-payment artifacts into polished, physics-driven interactive surfaces. Instead of showing flat, disposable screenshots, receipts become readable hero objects with motion, depth, and interaction.

This application solves a common product problem: receipts and proof-of-payment artifacts usually feel disposable, unreadable, and visually weak. It provides a stronger presentation layer for checkout flows, digital storefronts, dashboards, or proof-of-purchase experiences. ]
Stack:          [ e.g. Vanilla JavaScript, HTML Canvas, Custom Mesh Deformation, Browser-Native File Handling, Physics Engine ]
Live URL:       [ https:// ]
GitHub URL:     [ https://github.com/maxchichar/MAXCHICHAR-LIVE-RECEIPT ]
Screenshot:     [ /src/assets/projects/flagship.png ]
Year:           [ 2026 ]
```

### 4.2 Other Projects (leaderboard — ranked by importance to you)

```
Project 2
  Name:         [ TOVO ]
  Description:  [ A Digital Order Management Tracker ]
  Stack:        [ HTML, TailwindCSS, JavaScript, Python, Browser LocalStorage (offline-ready) ]
  Link:         [ URL ]
  GitHub:       [ https://github.com/maxchichar/Tovo ]

Project 3
  Name:         [ ]
  Description:  [ One line ]
  Stack:        [ ]
  Link:         [ ]
  GitHub:       [ ]

Project 4
  Name:         [ ]
  Description:  [ One line ]
  Stack:        [ ]
  Link:         [ ]
  GitHub:       [ ]

Project 5
  Name:         [ ]
  Description:  [ One line ]
  Stack:        [ ]
  Link:         [ ]
  GitHub:       [ ]

[ Add more as needed ]
```

---

## 5. Blockchain Section

This section shows your blockchain credibility.
Fill in real experience or leave the defaults Claude Code will use.

```
Headline:       [ e.g. "I build on-chain." ]
Subheading:     [ e.g. "Smart contracts, DeFi protocols, NFT infrastructure." ]

Credentials (list 2–4):
  [ e.g. "Deployed 12 smart contracts on Ethereum mainnet" ]
  [ e.g. "Built a DEX aggregator processing $2M+ volume" ]
  [ e.g. "Contributed to [Protocol Name] audit" ]
  [ Add your real ones ]
```

---

## 6. AI Agents Section

```
Headline:       [ e.g. "My AI stack." ]
Subheading:     [ e.g. "The agents I deploy daily." ]

Agents you actually use (add/remove):
  - Claude      → [ what you use it for, e.g. "Code review + reasoning" ]
  - GPT-4       → [ ]
  - Midjourney  → [ ]
  - Gemini      → [ ]
  - Cursor      → [ ]
  - Perplexity  → [ ]
  [ Add your real tools ]
```

---

## 7. Blog

See BLOG.md for full blog spec and post format.
List your planned first posts here so Claude Code can scaffold them:

```
Post 1:
  ---
Title:       Run Claude Code for Free in VS Code Using NVIDIA NIM (No API Bill)
Slug:        run-claude-code-free-vscode-nvidia-nim
Date:        2026-04-26
Category:    AI Tools & Development
Excerpt:     How I set up Claude Code to run completely free in VS Code (including on non-persistent machines) by routing it through NVIDIA's free NIM inference tier. A practical guide for developers who want powerful AI coding without paying for Anthropic's API.
Status:      draft
---

# Run Claude Code for Free in VS Code Using NVIDIA NIM

**Published:** April 26, 2026  
**Author:** Chibueze Maxwell (@MAXCHICHAR)

Claude Code is currently one of the most capable AI coding agents available. However, using it directly requires a paid Anthropic API subscription, which can be a barrier for many developers, students, and builders.

I recently discovered and documented a clean workaround: **running Claude Code 100% free** by routing requests through NVIDIA's NIM free tier using an open-source proxy.

### Why This Setup Matters

- No Anthropic API key or subscription needed
- Works directly inside **VS Code** (sidebar + terminal)
- Handles **non-persistent environments** (cloud IDEs, lab machines, temporary Linux setups)
- Only one lightweight startup script per session

### How It Works

The solution uses a proxy called `free-claude-code` that intercepts Claude Code's requests and redirects them to **NVIDIA NIM**’s free inference endpoint (40 requests per minute, no credit card required).

**The Stack:**
- **NVIDIA NIM** — Free AI inference layer
- **Anthropic Claude Code** — Powerful coding agent
- **free-claude-code proxy** — The bridge between them
- **Visual Studio Code** — Clean sidebar interface

### What You Get

- Full Claude Code experience in the VS Code sidebar
- Terminal support
- Reliable performance on temporary or shared machines
- Zero ongoing cost for basic usage

This setup is especially useful for:
- Students working on university lab or cloud machines
- Independent developers avoiding extra API expenses
- Anyone building in non-persistent Linux environments

### Full Guide & Setup

I documented the complete step-by-step process so you don’t have to piece it together yourself.

→ Check out the full guide here:  
[https://github.com/maxchichar/free-claude-code-vscode-guide](https://github.com/maxchichar/free-claude-code-vscode-guide)

If this helped you, a star on the repo goes a long way.

### Final Thoughts

The barrier to accessing powerful AI coding tools is dropping rapidly. With creative use of free tiers and open-source proxies, developers can now access near state-of-the-art coding agents without breaking the bank.

The question is no longer “Can I afford it?” but “What will I build with it?”

Stay building.

---

**Chibueze Maxwell**  
Serial Entrepreneur | Code → Control | Blockchain & AI  
Rare drops. When I post, it hits.

Post 2:
  Title:    [ ]
  Slug:     [ ]
  Date:     [ ]
  Category: [ ]
  Excerpt:  [ ]
  Status:   [ draft ]

[ Add more posts ]
```

---

## 8. Social Links

```
GitHub:    https://github.com/maxchichar
X:         https://x.com/MAXCHICHAR
LinkedIn:  https://linkedin.com/in/chibueze-maxwell-67558037a
Email:     [maxwellchibuezecharles@gmail.com ]
```

One-line descriptors for the Contact section:

```
GitHub:   [ e.g. "See the code behind the curtain" ]
X:        [ e.g. "Thoughts, half-baked ideas, the process" ]
LinkedIn: [ e.g. "The professional version of all this" ]
```

---

## 9. Gate / Entrance Text

The typewriter and TTS use these. Edit if you want custom lines.

```
Terminal lines (typed during boot):
  Line 1: "> INITIALIZING MAXCHICHAR.SYSTEM..."
  Line 2: "> LOADING DESIGN PROTOCOLS..."
  Line 3: "> CALIBRATING VISUAL ENGINE..."
  Line 4: "> AUTHENTICATION REQUIRED."
  [ Add or replace with your own lines ]

TTS greeting (spoken after gate opens):
  EN: "Welcome to the MAXCHICHAR archive. I am your system guide."
  [ Claude Code will auto-translate the others — or write your own ]
```

---

## 10. Avatar & Throne Image

See the "How to give Claude Code your avatar" section in BLOG.md.

```
Avatar image:   /src/assets/avatar.png      ← your photo
Throne image:   /src/assets/throne.png      ← optional background throne
Composite:      Claude Code will layer them  ← or provide a pre-made composite
```

---

_Fill this file before running Prompt 5 (Hero) and Prompt 10 (About/Contact)._
_The more detail you give here, the more human your site will feel._
