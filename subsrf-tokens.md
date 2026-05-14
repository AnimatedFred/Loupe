# Subsrf Tokens

> Extract the design system hidden inside any live website. One click.

**Product:** Subsrf Tokens
**Type:** Web app + MCP Tool — part of the Subsrf ecosystem
**Domain:** tokens.subsrf.dev
**Status:** Pre-build — v1.0 spec
**Date:** 2025

---

## What is Subsrf Tokens?

Every live website runs on a design system — whether the team that built it knows it or not. Colors, typography scales, spacing rhythms, border radii, shadow styles — they exist in the computed CSS of every rendered page. They're just invisible.

Subsrf Tokens reads the subsurface of any webpage and surfaces that hidden design system as structured, exportable design tokens.

Point it at any URL. In seconds you get the full token set: every color in use, every font and size pairing, every spacing value, every shadow, every radius. Cleaned, deduplicated, named, and ready to export into whatever format your workflow uses — Tailwind, CSS custom properties, Style Dictionary, Figma Variables, or raw JSON.

It works on your own site. It works on competitors' sites. It works on any page you can open in a browser.

---

## The Problem it Solves

### For designers joining a new project

You inherit a live product with no design system documentation. The Figma file is out of date or doesn't exist. The only source of truth is the running application. Subsrf Tokens reads it and gives you the actual token set in minutes — not days of manual inspection.

### For developers building a new component

You need to match the existing visual language but the tokens aren't documented anywhere. You open DevTools and start copying hex values one by one. Subsrf Tokens extracts all of them at once, named and structured.

### For agencies doing competitive research

Your client wants to know how competitor sites are designed. Typography choices, color palettes, spacing systems. Subsrf Tokens turns any competitor URL into a structured design brief in under a minute.

### For teams migrating to a design system

You have a legacy codebase with inconsistent styles scattered across thousands of CSS rules. Subsrf Tokens audits the live site and shows you exactly what values are actually in use — not what the CSS says, but what the browser computes and renders. That's the difference between what was intended and what actually shipped.

### For AI-assisted design and development

You're prompting Claude, Cursor, or Lovable to build a new page. You want it to match the existing site's design language exactly. Subsrf Tokens gives you the full token set, cleaned and ready to paste — no manual extraction, no approximation.

---

## How it Works

```
URL input (web app or MCP tool)
        ↓
Headless browser renders the full page
        ↓
getComputedStyle() runs across all rendered elements
        ↓
Values are deduplicated, clustered, and frequency-ranked
        ↓
Tokens are named automatically using semantic heuristics
        ↓
Dark / light mode sets detected and separated
        ↓
Output in chosen format
```

### The extraction pipeline

**1. Compute, not parse**
Subsrf reads `getComputedStyle()` values from a fully rendered page — not raw CSS files. Variables are resolved, inheritance applied, media queries evaluated. You get what the browser actually drew, not what someone wrote three years ago.

**2. Deduplicate and cluster**
A typical site might reference 40 shades of grey across thousands of elements. Subsrf clusters them: identical values are merged, near-identical values within a perceptual threshold are grouped, and the most frequent becomes the canonical token. The output is clean.

**3. Frequency rank**
Every token carries a usage count. A color used on 847 elements is weighted differently from a one-off accent used twice. Tokens are sorted by frequency so the core system is immediately visible.

**4. Semantic naming**
Tokens are named automatically using role and lightness heuristics:
- Colors named by role (text, background, border, accent) and lightness level
- Type sizes named on a scale (xs, sm, base, lg, xl, 2xl...)
- Spacing follows a numeric scale relative to the detected base unit
- Shadows named by elevation (sm, md, lg)
- Radii named by size (none, sm, md, lg, full)

Names can be overridden before export.

**5. Dark / light mode detection**
Subsrf detects `@media (prefers-color-scheme)` and `[data-theme]` attribute switching. When both modes are present, tokens are extracted for each and presented as a dual-mode set.

---

## What Tokens Are Extracted

### Colors

| Token type | Example output |
|---|---|
| Text colors | `--color-text-primary: #0A0A14` |
| Background colors | `--color-bg-surface: #111118` |
| Border colors | `--color-border-default: rgba(255,255,255,0.08)` |
| Accent / brand colors | `--color-accent: #00FF87` |
| Status colors | `--color-success: #39D98A` · `--color-error: #FF4D4D` |
| Gradient definitions | `--gradient-hero: linear-gradient(135deg, #6366f1, #4338ca)` |

Colors are extracted in all formats: hex, rgb, hsl, and oklch. Alpha channels preserved.

### Typography

| Token type | Example output |
|---|---|
| Font families | `--font-display: 'Manrope', sans-serif` |
| Font sizes | `--text-base: 16px` · `--text-lg: 18px` |
| Font weights | `--font-bold: 700` · `--font-medium: 500` |
| Line heights | `--leading-body: 1.75` · `--leading-tight: 1.1` |
| Letter spacing | `--tracking-wide: 0.05em` |
| Font pairings | Display font + body font relationship detected and named |

### Spacing

| Token type | Example output |
|---|---|
| Padding values | `--space-4: 16px` · `--space-8: 32px` |
| Margin values | Merged with padding where values match |
| Gap values | `--gap-card: 24px` |
| Base unit | Detected automatically (4px, 8px, 5px, etc.) |

Subsrf detects the base unit of the spacing system and presents the full scale relative to it.

### Border Radius

| Token type | Example output |
|---|---|
| Radius scale | `--radius-sm: 4px` · `--radius-md: 8px` · `--radius-lg: 16px` |
| Full / pill | `--radius-full: 9999px` |
| Component-specific | `--radius-card: 12px` · `--radius-btn: 6px` |

### Shadows

| Token type | Example output |
|---|---|
| Drop shadows | `--shadow-sm: 0 1px 3px rgba(0,0,0,0.1)` |
| Elevation scale | `--shadow-md: 0 4px 14px rgba(0,0,0,0.2)` |
| Colored shadows | `--shadow-accent: 0 4px 20px rgba(0,255,135,0.3)` |
| Inset shadows | `--shadow-inset: inset 0 0 12px rgba(0,0,0,0.15)` |

### Borders

| Token type | Example output |
|---|---|
| Border widths | `--border-thin: 1px` · `--border-thick: 2px` |
| Border styles | `--border-style: solid` |
| Border colors | Cross-referenced with color tokens |

### Transitions & Animation

| Token type | Example output |
|---|---|
| Duration | `--duration-fast: 150ms` · `--duration-base: 200ms` |
| Easing | `--ease-out: cubic-bezier(0,0,0.2,1)` |
| Common combos | `--transition-base: all 200ms ease-out` |

---

## Export Formats

All export formats are available to Starter and Pro. There is no free tier.

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-text-primary: #F2F2F4;
  --color-text-muted: rgba(242,242,244,0.55);
  --color-bg-void: #050508;
  --color-bg-surface: #111118;
  --color-accent: #00FF87;
  --color-success: #39D98A;
  --color-error: #FF4D4D;

  /* Typography */
  --font-display: 'Manrope', sans-serif;
  --font-mono: 'Azeret Mono', monospace;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --leading-body: 1.75;
  --leading-tight: 1.05;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.2);
  --shadow-accent: 0 0 30px rgba(0,255,135,0.2);
}
```

### Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        accent: '#00FF87',
        bg: { void: '#050508', surface: '#111118' },
        text: { primary: '#F2F2F4', muted: 'rgba(242,242,244,0.55)' },
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        mono:    ['Azeret Mono', 'monospace'],
      },
      fontSize: {
        base: '16px', lg: '18px', xl: '22px', '2xl': '28px',
      },
      spacing: {
        1: '4px', 2: '8px', 4: '16px',
        6: '24px', 8: '32px', 12: '48px', 16: '64px',
      },
      borderRadius: {
        sm: '4px', md: '8px', lg: '16px', full: '9999px',
      },
      boxShadow: {
        sm:     '0 1px 3px rgba(0,0,0,0.12)',
        md:     '0 4px 14px rgba(0,0,0,0.2)',
        accent: '0 0 30px rgba(0,255,135,0.2)',
      },
    }
  }
}
```

### Style Dictionary (JSON)

```json
{
  "color": {
    "text": {
      "primary": { "value": "#F2F2F4", "type": "color" },
      "muted":   { "value": "rgba(242,242,244,0.55)", "type": "color" }
    },
    "accent": { "value": "#00FF87", "type": "color" }
  },
  "font": {
    "family": {
      "display": { "value": "Manrope, sans-serif", "type": "fontFamily" }
    },
    "size": {
      "base": { "value": "16px", "type": "fontSize" }
    }
  },
  "space": {
    "4": { "value": "16px", "type": "spacing" },
    "8": { "value": "32px", "type": "spacing" }
  },
  "radius": {
    "md":   { "value": "8px",    "type": "borderRadius" },
    "full": { "value": "9999px", "type": "borderRadius" }
  }
}
```

### Figma Variables (JSON import)

Ready to import directly into Figma via the Variables API. Creates a Variable Collection named after the source domain with modes for light and dark where detected.

```json
{
  "name": "subsrf.dev tokens",
  "modes": ["Light", "Dark"],
  "variables": [
    {
      "name": "color/text/primary",
      "type": "COLOR",
      "values": {
        "Light": { "r": 0.05,  "g": 0.05,  "b": 0.08,  "a": 1 },
        "Dark":  { "r": 0.949, "g": 0.949, "b": 0.957, "a": 1 }
      }
    },
    {
      "name": "color/accent",
      "type": "COLOR",
      "values": {
        "Light": { "r": 0, "g": 0.9,  "b": 0.48,  "a": 1 },
        "Dark":  { "r": 0, "g": 1.0,  "b": 0.529, "a": 1 }
      }
    },
    { "name": "space/4",   "type": "FLOAT", "values": { "Default": 16 } },
    { "name": "radius/md", "type": "FLOAT", "values": { "Default": 8  } }
  ]
}
```

### AI Prompt — Gemini 1.5 Flash

The AI Prompt export uses **Gemini 1.5 Flash** to produce a semantically cleaned, human-readable token summary optimised for AI coding context windows. The extracted token JSON is sent to Gemini, which interprets value relationships and returns a structured brief ready to paste into Claude, Cursor, Lovable, v0, or any AI tool.

```
DESIGN TOKENS — subsrf.dev
Extracted by Subsrf · Generated by Gemini 1.5 Flash

COLORS
Primary text:    #F2F2F4
Secondary text:  rgba(242,242,244,0.55)
Background:      #050508
Surface:         #111118
Accent:          #00FF87     ← primary brand color, CTAs and active states
Success:         #39D98A
Error:           #FF4D4D

Dark mode: detected · Light mode values available on request

TYPOGRAPHY
Display:  Manrope, sans-serif — weight 800
Body:     Manrope, sans-serif — weight 300–500
Mono:     Azeret Mono, monospace
Base:     16px / line-height 1.75
Scale:    12 / 14 / 16 / 18 / 22 / 28 / 40 / 60px

SPACING — base unit: 4px
Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px

RADIUS
sm: 4px · md: 8px · lg: 16px · xl: 24px · full: 9999px

SHADOWS
sm:     0 1px 3px rgba(0,0,0,0.12)
md:     0 4px 14px rgba(0,0,0,0.2)
accent: 0 0 30px rgba(0,255,135,0.2) ← used on active CTAs

NOTES
- Strict 4px grid throughout spacing and radius
- Two-font system: Manrope (humanist sans) + Azeret Mono (code/data)
- #00FF87 is the sole accent — high-signal use only
- Dark-first system with light mode as secondary
```

This is the only action in Subsrf Tokens that calls an external AI API.

---

## Interfaces

### Web App — tokens.subsrf.dev

The primary interface. No browser extension required for public URLs.

1. Sign in with Subsrf account (Starter or Pro required)
2. Enter any public URL
3. Subsrf fetches and renders the page server-side via headless Chrome
4. Token extraction runs — typically 2–5 seconds
5. Results appear in the visual token explorer
6. Choose export format and download or copy

The explorer shows each token category as a visual panel — color swatches, type specimens, spacing rulers, shadow previews — not just raw values. Dark and light mode tokens are shown side-by-side when both are detected.

For pages behind authentication, staging environments, and localhost, extraction runs via the Subsrf Chrome extension in the active browser tab rather than server-side.

### MCP Tool — `subsrf_extract_tokens`

Available to **Pro** users only via the MCP Bridge at `api.subsrf.dev`.

Claude, Cursor, or any MCP-compatible client can call `subsrf_extract_tokens` with a URL and receive the full structured token set as data — no copy-paste required.

```
User: Extract the design tokens from stripe.com and use
      them to style this dashboard component.

Claude: [calls subsrf_extract_tokens with url="stripe.com"]
        [receives full token set as JSON]
        [applies tokens directly to component code]
```

**Tool schema:**

```json
{
  "name": "subsrf_extract_tokens",
  "description": "Extract design tokens from any live URL. Returns colors, typography, spacing, radius, shadows, and transitions as structured data.",
  "input_schema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "Full URL to extract tokens from"
      },
      "format": {
        "type": "string",
        "enum": ["css", "tailwind", "json", "style_dictionary", "figma", "ai_prompt"],
        "description": "Export format. Default: json"
      },
      "mode": {
        "type": "string",
        "enum": ["dark", "light", "both"],
        "description": "Which color mode to extract. Default: both"
      }
    },
    "required": ["url"]
  }
}
```

---

## Access & Tier Structure

Subsrf Tokens is a paid feature. There is no free tier. It is included in existing Subsrf subscriptions at no extra cost.

| Feature | Free | Starter $9/mo | Pro $19/mo |
|---|:---:|:---:|:---:|
| Web app — tokens.subsrf.dev | — | ✓ | ✓ |
| URL extraction — unlimited | — | ✓ | ✓ |
| All token types (colors, typography, spacing, radius, shadows, borders, transitions, gradients) | — | ✓ | ✓ |
| CSS Custom Properties export | — | ✓ | ✓ |
| Tailwind Config export | — | ✓ | ✓ |
| JSON export | — | ✓ | ✓ |
| Style Dictionary export | — | ✓ | ✓ |
| Figma Variables export | — | ✓ | ✓ |
| Dark / light mode detection and dual-mode token sets | — | ✓ | ✓ |
| AI Prompt export (Gemini 1.5 Flash — 1 credit) | — | ✓ | ✓ |
| Token history (last 30 extractions) | — | ✓ | ✓ |
| Shareable token set links | — | ✓ | ✓ |
| `subsrf_extract_tokens` MCP tool | — | — | ✓ |
| MCP `format` parameter (css, tailwind, figma…) | — | — | ✓ |
| MCP `mode` parameter (dark, light, both) | — | — | ✓ |

> Free Subsrf users land on a tokens.subsrf.dev upgrade page. There is no partial free access — the extraction infrastructure has a real per-run compute cost that rules out a free tier.

---

## Credit Cost

Token extraction and all standard exports consume **no credits** — they are pure server-side compute, not AI API calls.

The AI Prompt export calls Gemini 1.5 Flash and costs **1 credit** from the user's shared monthly credit pool.

| Action | Credits | Available |
|---|:---:|---|
| URL extraction | 0 | Starter + Pro |
| CSS / Tailwind / JSON / Style Dictionary / Figma export | 0 | Starter + Pro |
| Dark / light mode detection | 0 | Starter + Pro |
| `subsrf_extract_tokens` MCP tool call | 0 | Pro only |
| AI Prompt export — Gemini 1.5 Flash | 1 | Starter + Pro |

Credits are shared with all other Subsrf AI features (Studio analysis, Smart Prompt Engine). Monthly allowances: Starter 75 credits, Pro 300 credits.

---

## Infrastructure & Cost Model

### Stack

| Component | Technology | Host |
|---|---|---|
| Web app | Next.js | Vercel |
| Extraction service | Node.js + Playwright (headless Chrome) | Railway |
| MCP Bridge | Existing `api.subsrf.dev` | Railway |
| AI Prompt export | Google Gemini 1.5 Flash API | Google AI |
| Auth | Shared Subsrf JWT | — |
| Database | Supabase (history, shareable links, rate limits) | Supabase |

### Per-extraction compute cost

A single extraction involves: launching headless Chrome via Playwright, navigating to the URL, waiting for network idle, running `getComputedStyle()` across all elements, clustering and naming tokens, returning JSON.

| Cost component | Basis | Est. cost per extraction |
|---|---|---|
| Railway CPU (~3s active, shared instance) | $0.000463/vCPU-min | ~$0.00008 |
| Railway memory (1 GB peak, ~5s) | $0.000231/GB-min | ~$0.00002 |
| Outbound bandwidth (avg rendered page ~500 KB) | $0.10/GB | ~$0.00005 |
| Playwright + Chromium overhead (amortised) | fixed cost ÷ volume | ~$0.0005 at 1k/mo |
| **Total per extraction (low volume)** | | **~$0.0006** |
| **Total per extraction (high volume, 10k+/mo)** | | **~$0.00015** |

At scale, the Playwright worker stays warm and amortised fixed costs drop sharply.

### Gemini 1.5 Flash — AI Prompt export cost

Gemini 1.5 Flash pricing (Google AI, 2025): **$0.075 / 1M input tokens · $0.30 / 1M output tokens**

Typical AI Prompt export payload:

| Component | Tokens | Cost |
|---|---|---|
| Input — structured token JSON | ~2,000 tokens | ~$0.00015 |
| Output — formatted AI prompt | ~800 tokens | ~$0.00024 |
| **Total per AI Prompt export** | ~2,800 tokens | **~$0.00039** |

Credit margin on AI Prompt export:

| Tier | Credit value | Gemini cost | Margin |
|---|---|---|---|
| Starter | $0.12 / credit | ~$0.00039 | **~99.7%** |
| Pro | $0.063 / credit | ~$0.00039 | **~99.4%** |

### Monthly infrastructure cost scenarios

**Scenario A — 50 Starter users, 20 extractions/month average**

| Item | Calculation | Monthly cost |
|---|---|---|
| Extractions | 1,000 × $0.0006 | $0.60 |
| AI Prompt exports (est. 20% of extractions) | 200 × $0.00039 | $0.08 |
| Railway base worker (always-on, 512 MB) | fixed | $5.00 |
| Supabase (free tier covers this volume) | — | $0.00 |
| **Total infrastructure** | | **$5.68** |
| **Revenue** | 50 × $9 = $450 | |
| **Net margin** | | **98.7%** |

**Scenario B — 200 Starter + 50 Pro, 40 extractions/month average**

| Item | Calculation | Monthly cost |
|---|---|---|
| Web app extractions | 10,000 × $0.0006 | $6.00 |
| MCP tool calls — Pro (est. 100 calls/user) | 5,000 × $0.0006 | $3.00 |
| AI Prompt exports (est. 25%) | 3,750 × $0.00039 | $1.46 |
| Railway (2 workers to handle concurrency) | 2 × $5 | $10.00 |
| Supabase Pro | | $25.00 |
| **Total infrastructure** | | **$45.46** |
| **Revenue** | (200 × $9) + (50 × $19) = $2,750 | |
| **Net margin** | | **98.3%** |

**Scenario C — 500 Starter + 200 Pro, 60 extractions/month average**

| Item | Calculation | Monthly cost |
|---|---|---|
| Web app extractions | 42,000 × $0.00015 | $6.30 |
| MCP tool calls — Pro | 40,000 × $0.00015 | $6.00 |
| AI Prompt exports (est. 25%) | 20,500 × $0.00039 | $7.99 |
| Railway (auto-scaled, avg 4 workers) | 4 × $5 | $20.00 |
| Supabase Pro | | $25.00 |
| **Total infrastructure** | | **$65.29** |
| **Revenue** | (500 × $9) + (200 × $19) = $8,300 | |
| **Net margin** | | **99.2%** |

At scale, per-extraction costs drop as Playwright workers stay warm and Railway fixed costs are amortised across higher volume. Margin improves with growth.

### Rate limits (cost protection)

| Tier | Max extractions / day | Max concurrent |
|---|---|---|
| Starter | 50 | 1 |
| Pro | 200 | 3 |

Worst-case daily cost for a single Starter user at the limit: 50 × $0.0006 = **$0.03/day** = **$0.90/month**. Well within the $9/month revenue.

---

## What Subsrf Tokens Does Not Extract

- **Keyframe animations** — defined in `@keyframes` but not computed per-element
- **SVG presentation attributes** — `fill` and `stroke` on SVG elements (computed color is read but SVG-specific attributes are not)
- **Print styles** — `@media print` is not evaluated
- **JavaScript-driven styles applied after render** — the web app captures initial render state. The Chrome extension (Starter+, running in the active tab) captures the live DOM and catches dynamically applied styles.
- **Font files** — family names are extracted; font files are not downloaded

---

## Comparison to Existing Tools

| Tool | How it works | Gap vs Subsrf Tokens |
|---|---|---|
| Chrome DevTools | Manual inspection per element | No bulk extraction, no export |
| Zeplin / Storybook | Requires source access or integration | Can't read a live external site |
| Chromatic | Screenshot-based visual testing | Not token extraction |
| Token Farmer (browser ext) | CSS file parsing | Parses raw CSS, not computed values. Misses variable resolution. |
| Figma Inspect | Reads Figma source | Only works if you have the Figma file |

Subsrf Tokens is the only tool that reads **computed** values from **any live URL** with **no source access required**, exports to **all major token formats**, detects **dark and light mode** automatically, and makes the token set available to any **MCP-compatible AI client**.

---

## Token Naming Conventions

Subsrf uses a consistent naming hierarchy across all formats:

```
category / role / variant

color/text/primary
color/text/muted
color/bg/surface
color/accent
space/4
space/8
radius/md
shadow/md
font/family/display
font/size/lg
```

Names can be overridden in the web app before export. Custom names persist in token history.

---

## Implementation Phases

These phases are written for AI-assisted implementation. Each phase is independently deployable and testable before moving to the next.

---

### Phase 1 — Extraction Service

**Goal:** A standalone Node.js microservice that accepts a URL, renders it via Playwright, and returns a structured token JSON.

**Inputs:** `{ url: string, mode: 'dark' | 'light' | 'both' }`

**Outputs:** Token JSON object (see schema in Appendix)

**Tasks:**

1. Scaffold Node.js service on Railway with Playwright and Chromium installed
2. Create `POST /extract` endpoint accepting `{ url, mode }` with JWT auth middleware
3. Launch headless Chromium, navigate to URL, wait for `networkidle` + 1s settle
4. Inject content script via `page.evaluate()`:
   - `document.querySelectorAll('*')` — all elements
   - `window.getComputedStyle(el)` per element — collect all relevant properties
   - Track frequency (element count) per unique value
5. Run deduplication pipeline:
   - Exact-match merge first pass
   - Perceptual color clustering: convert to CIELAB, merge pairs where ΔE < 5
   - Most frequent value in a cluster becomes the canonical token
6. Detect base spacing unit — GCD of all spacing values > 2px
7. Apply semantic naming heuristics per category
8. Dark / light mode: check `document.styleSheets` for `prefers-color-scheme`. If detected, run extraction twice with Playwright's `emulateMedia({ colorScheme })`. Return `{ dark: {...}, light: {...} }`.
9. Add rate limiting per user via Redis: 50/day Starter, 200/day Pro
10. Return structured JSON with `meta` block (base unit, mode flags, extraction time)

**Tech:** Node.js, Playwright, Railway, Redis, JWT

---

### Phase 2 — Web App

**Goal:** Next.js web app at `tokens.subsrf.dev` for authenticated Starter and Pro users.

**Tasks:**

1. Next.js app on Vercel with Tailwind CSS
2. Auth: validate Subsrf JWT on load. Unauthenticated → redirect to `subsrf.dev/pricing`
3. Free users → upgrade interstitial page, no extraction access
4. URL input form: validate URL format, POST to extraction service, poll until done (30s timeout)
5. Loading state with progress indicator
6. Token explorer — tabbed panels per category:
   - **Colors:** swatch grid, hex value, usage count, token name. Click to copy.
   - **Typography:** live type specimens at each size/weight. Click to copy.
   - **Spacing:** horizontal bar visualisation of scale. Click to copy.
   - **Radius:** visual square previews per radius value. Click to copy.
   - **Shadows:** card previews with applied shadow. Click to copy.
   - **Transitions:** listed with easing name. Click to copy.
7. Dark / light toggle — visible when dual-mode tokens detected. Switches all panels.
8. Export sidebar:
   - Format selector: CSS / Tailwind / JSON / Style Dictionary / Figma / AI Prompt
   - Code preview — syntax-highlighted, updates on format change
   - Download button — Next.js API route generates file with correct `Content-Disposition`
   - Copy to clipboard button
9. Token history — last 30 extractions per user from Supabase. List with URL, timestamp, token count. Click to reload without re-extracting.
10. Shareable links — `POST /api/share` creates a Supabase row with a 6-char slug. Public route `tokens.subsrf.dev/s/[slug]` renders read-only explorer.

**Tech:** Next.js, Tailwind, Vercel, Supabase

---

### Phase 3 — Export Format Transformers

**Goal:** Pure functions that transform the internal token JSON into each export format.

Each transformer: `transformToFormat(tokens: TokenSet, format: string, mode: 'dark' | 'light' | 'both') → string`

**Tasks:**

1. **CSS Custom Properties** — `:root { --[name]: [value]; }` grouped by category with comments. Dual-mode: `@media (prefers-color-scheme: dark) { :root { ... } }` appended.
2. **Tailwind Config** — `module.exports = { theme: { extend: { ... } } }`. Nested color keys. Handles `rgba()` values as Tailwind arbitrary values.
3. **JSON** — flat `{ "name": "...", "value": "...", "type": "..." }` array or nested by category. Configurable via query param `?structure=flat|nested`.
4. **Style Dictionary** — W3C design token spec format: `{ "color": { "accent": { "value": "#00FF87", "type": "color" } } }`.
5. **Figma Variables** — array of `{ name, type, values: { [mode]: value } }`. Colors converted from CSS hex/rgb to Figma 0–1 float format. Multi-mode where both dark and light exist.
6. **AI Prompt** — see Phase 4.

All transformers: unit-tested against a fixed token set fixture. Output validated against format spec.

Download: Next.js API route at `/api/export?format=[format]&extractionId=[id]`. Reads from Supabase, runs transformer, streams file with correct headers (`.css`, `.js`, `.json`, `.json`, `.json`, `.txt`).

---

### Phase 4 — AI Prompt Export (Gemini)

**Goal:** When a user requests the AI Prompt export, send the token JSON to Gemini 1.5 Flash and return a human-readable, AI-optimised summary.

**Tasks:**

1. Install `@google/generative-ai` SDK
2. Create `POST /api/tokens/ai-prompt` Next.js API route
3. Auth check: Starter or Pro only
4. Credit check: 1 credit required. Return `402 INSUFFICIENT_CREDITS` if zero.
5. Deduct 1 credit optimistically in Supabase
6. Build and send Gemini request:

```js
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const systemInstruction = `You are a design system analyst. 
Given a structured JSON of extracted design tokens from a live website, 
produce a clean, human-readable summary optimised as context for AI coding 
prompts (Claude, Cursor, Lovable, v0, Bolt).

Rules:
- Group by category with ALL-CAPS section headers
- Include hex values and a brief contextual note on usage role where clear
- Note the base spacing unit and the full scale
- Identify the primary accent color and its usage pattern
- Separate dark and light mode values where both exist
- Total output under 400 words
- Plain text only — no markdown, no code blocks, no backticks`;

const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: JSON.stringify(tokens) }] }],
  systemInstruction,
  generationConfig: { maxOutputTokens: 800, temperature: 0.2 },
});
```

7. On success: return generated text, confirm credit deduction
8. On failure: refund credit in Supabase, return `500` with retry option
9. Cache result per token-set hash in Supabase for 24h — identical extractions do not re-charge

---

### Phase 5 — MCP Tool

**Goal:** Register `subsrf_extract_tokens` on the existing MCP Bridge at `api.subsrf.dev`. Pro users only.

**Tasks:**

1. Add `TOKEN_EXTRACTION_URL` environment variable to MCP Bridge pointing at Railway service
2. Register tool in `server.js`:

```js
server.tool(
  'subsrf_extract_tokens',
  'Extract design tokens from any live URL. Returns colors, typography, spacing, radius, shadows, and transitions.',
  {
    url:    z.string().describe('Full URL to extract tokens from'),
    format: z.enum(['css','tailwind','json','style_dictionary','figma','ai_prompt']).optional(),
    mode:   z.enum(['dark','light','both']).optional(),
  },
  async ({ url, format = 'json', mode = 'both' }, context) => {
    // 1. Validate Pro tier from JWT claims in context
    if (context.tier !== 'pro') return { content: [{ type: 'text', text: 'PRO_REQUIRED: subsrf_extract_tokens requires Subsrf Pro.' }] };

    // 2. Rate limit check (200/day for Pro)
    const limited = await checkRateLimit(context.userId, 'tokens', 200);
    if (limited) return { content: [{ type: 'text', text: 'RATE_LIMITED: 200 extraction limit reached for today.' }] };

    // 3. Call extraction service
    const tokens = await fetch(`${process.env.TOKEN_EXTRACTION_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mode }),
    }).then(r => r.json());

    // 4. If format === 'ai_prompt': call Gemini, deduct 1 credit
    if (format === 'ai_prompt') {
      const prompt = await generateAiPrompt(tokens, context.userId);
      return { content: [{ type: 'text', text: prompt }] };
    }

    // 5. Run format transformer
    const output = transformToFormat(tokens, format);
    return { content: [{ type: 'text', text: output }] };
  }
);
```

3. Pro tier guard — read `tier` from JWT claims. Return structured error for non-Pro.
4. Error handling: invalid URL (400), unreachable URL (504 with message), extraction timeout >30s (504), rate limit (429)
5. Integration test: configure `subsrf` MCP in Claude Desktop, call `subsrf_extract_tokens` on a real URL in all six formats, verify output

---

### Phase 6 — Database, History & Shareable Links

**Goal:** Supabase schema for token history, shareable links, and rate limit tracking.

**Schema:**

```sql
-- Token extraction history
create table token_extractions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  url           text not null,
  extracted_at  timestamptz default now(),
  token_count   integer,
  has_dark      boolean default false,
  has_light     boolean default false,
  base_unit     integer,
  tokens_json   jsonb not null
);

create index on token_extractions (user_id, extracted_at desc);

-- Shareable links
create table token_shares (
  id             uuid primary key default gen_random_uuid(),
  extraction_id  uuid references token_extractions not null,
  share_slug     text unique not null,
  created_at     timestamptz default now(),
  view_count     integer default 0
);

-- Rate limit tracking
create table token_rate_limits (
  user_id  uuid references auth.users not null,
  date     date not null,
  count    integer default 0,
  primary key (user_id, date)
);
```

**History tasks:**
- On every successful extraction: insert into `token_extractions`
- Enforce last 30 per user: delete oldest record when count > 30 (database trigger)
- History panel in web app: list by `extracted_at desc`, show URL, timestamp, token count, dark/light chips
- Click to reload: read `tokens_json` from Supabase, skip extraction service entirely

**Shareable links tasks:**
- `POST /api/share { extractionId }` → insert `token_shares` row with `nanoid(6)` slug → return `{ url: 'tokens.subsrf.dev/s/[slug]' }`
- Public route `tokens.subsrf.dev/s/[slug]` → read extraction from DB → render read-only token explorer
- No auth required to view shared links
- Increment `view_count` on each visit
- Export panel on shared view: all format downloads available, AI Prompt export requires sign-in

---

## Appendix

### Token JSON internal schema

```json
{
  "url": "https://subsrf.dev",
  "extractedAt": "2025-05-12T10:00:00Z",
  "modes": ["dark", "light"],
  "dark": {
    "colors": [
      { "name": "color/text/primary", "value": "#F2F2F4", "frequency": 847, "roles": ["text"] },
      { "name": "color/accent",       "value": "#00FF87", "frequency": 89,  "roles": ["background","border"] }
    ],
    "typography": [
      { "name": "font/family/display", "value": "Manrope, sans-serif", "frequency": 312 },
      { "name": "font/size/base",      "value": "16px",                "frequency": 287 }
    ],
    "spacing": [
      { "name": "space/4",  "value": "16px", "frequency": 156 },
      { "name": "space/8",  "value": "32px", "frequency": 78  }
    ],
    "radius": [
      { "name": "radius/md",   "value": "8px",    "frequency": 134 },
      { "name": "radius/full", "value": "9999px", "frequency": 22  }
    ],
    "shadows": [
      { "name": "shadow/md", "value": "0 4px 14px rgba(0,0,0,0.2)", "frequency": 67 }
    ],
    "transitions": [
      { "name": "transition/base", "value": "all 200ms ease-out", "frequency": 89 }
    ]
  },
  "light": {},
  "meta": {
    "baseUnit": 4,
    "hasDarkMode": true,
    "hasLightMode": true,
    "totalTokens": 47,
    "extractionMs": 1240
  }
}
```

### Environment variables

```bash
# Extraction service (Railway)
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
REDIS_URL=

# Web app (Vercel)
NEXT_PUBLIC_EXTRACTION_URL=https://tokens-extract.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
JWT_SECRET=

# MCP Bridge addition (api.subsrf.dev)
TOKEN_EXTRACTION_URL=https://tokens-extract.up.railway.app
```

---

*tokens.subsrf.dev · Subsrf Inc. · v1.0 spec · 2025 · Confidential*
