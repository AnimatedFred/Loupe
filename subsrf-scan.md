# Subsrf Scan

> Read any interface deeper than any human can.

**Product:** Subsrf Scan (formerly Subsrf Tokens)
**Type:** Web app + MCP Tool — part of the Subsrf ecosystem
**Domain:** scan.subsrf.dev
**Status:** v2.0 spec — upgrade from Tokens v1.0
**Date:** 2025

---

## What is Subsrf Scan?

Subsrf Scan is the design intelligence layer for any live interface.

Point it at any URL and it reads the subsurface — the hidden design system that every website runs on but almost nobody has documented. Colors, typography, spacing, shadows, radii, animations. Then it goes further: it scores the system for consistency, critiques it for problems, compares it to any other site, detects which component library it's built on, and turns the entire analysis into actionable output for designers, developers, and AI tools.

It started as a token extractor. It is now the most complete design intelligence tool that exists.

---

## The Problem it Solves

### For designers joining a new project
You inherit a live product with no design system documentation. The Figma file is out of date or missing. Subsrf Scan reads the running application and returns the actual token set, a health score, and a list of inconsistencies — in under 30 seconds.

### For developers building new components
You need to match the existing visual language but nothing is documented. Subsrf Scan extracts every value, names it semantically, and exports it into your exact format — Tailwind, CSS variables, Figma Variables, whatever you use.

### For agencies doing competitive research
Your client wants to understand how competitor sites are designed. Subsrf Scan turns any URL into a structured design brief, a component library fingerprint, and a brand coherence score. Every competitive audit starts here.

### For teams doing design system migrations
Your legacy codebase has hardcoded values everywhere. Subsrf Scan extracts what's actually in use, maps hardcoded values to token names, and outputs a migration script. What used to take weeks takes minutes.

### For AI-assisted development
You're prompting Claude, Cursor, or Lovable to build a page. You want it to match the existing design language exactly. Subsrf Scan gives the AI a complete, structured design context — values, relationships, patterns, and critique — not just a list of hex codes.

---

## How it Works

```
URL input (web app or MCP tool)
        ↓
Headless Chrome renders the full page
        ↓
getComputedStyle() + Web Animations API across all elements
        ↓
Values deduplicated, clustered, frequency-ranked
        ↓
Tokens named using semantic heuristics
        ↓
Dark / light mode sets detected and separated
        ↓
Component library fingerprinted against reference database
        ↓
Health score calculated — consistency + WCAG contrast checks
        ↓
Gemini analysis layer — critique, suggestions, brand score
        ↓
Output in chosen format
```

### Core extraction principles

**Computed, not parsed**
Subsrf reads `getComputedStyle()` values from a fully rendered page — not raw CSS files. CSS variables are resolved, inheritance applied, media queries evaluated. You get what the browser actually drew.

**Deduplicate and cluster**
Identical values are merged. Near-identical values (colors within ΔE < 5 in CIELAB space) are grouped and the most frequent becomes the canonical token. Output is clean — not a raw dump of every value on the page.

**Frequency ranked**
Every token carries a usage count. A color used on 847 elements is core system. One used twice is an outlier. Both are visible, separately weighted.

**Semantic naming**
Colors named by role and lightness. Type sizes on a named scale. Spacing relative to detected base unit. Shadows by elevation. Names can be overridden before export.

**Dark and light mode**
Detects `@media (prefers-color-scheme)` and `[data-theme]` patterns. Extracts both modes. Returns dual token sets.

**Animation extraction**
Uses `document.getAnimations()` via the Web Animations API — not just CSS properties. Captures running animations: duration, easing, delay, fill mode. No other tool does this.

---

## Feature Set

---

### 1. Token Extraction

The core. Everything else builds on this.

#### Colors

| Token type | Example |
|---|---|
| Text colors | `--color-text-primary: #0A0A14` |
| Background colors | `--color-bg-surface: #111118` |
| Border colors | `--color-border-default: rgba(255,255,255,0.08)` |
| Accent / brand | `--color-accent: #00FF87` |
| Status colors | `--color-success: #39D98A` · `--color-error: #FF4D4D` |
| Gradients | `--gradient-hero: linear-gradient(135deg, #6366f1, #4338ca)` |

Colors extracted in hex, rgb, hsl, and oklch. Alpha preserved.

#### Typography

| Token type | Example |
|---|---|
| Font families | `--font-display: 'Manrope', sans-serif` |
| Font sizes | `--text-base: 16px` · `--text-lg: 18px` |
| Font weights | `--font-bold: 700` · `--font-medium: 500` |
| Line heights | `--leading-body: 1.75` · `--leading-tight: 1.1` |
| Letter spacing | `--tracking-wide: 0.05em` |
| Font pairings | Display + body relationship detected |

#### Spacing

| Token type | Example |
|---|---|
| Padding / margin / gap | `--space-4: 16px` · `--space-8: 32px` |
| Base unit | Detected automatically — 4px, 8px, 5px, etc. |
| Full scale | Relative to base unit |

#### Radius, Shadows, Borders, Transitions

All extracted with the same deduplication and semantic naming pipeline. Shadows include colored glow variants. Transitions include duration and easing separately.

#### Animations (new in Scan)

Via `document.getAnimations()`:

| Token type | Example |
|---|---|
| Duration | `--anim-duration-fast: 150ms` |
| Easing | `--anim-ease-spring: cubic-bezier(0.34,1.56,0.64,1)` |
| Delay patterns | `--anim-delay-stagger: 50ms` |
| Fill mode | `--anim-fill: forwards` |

---

### 2. Component Library Detection

Subsrf Scan fingerprints the extracted token set against a reference database of known design systems and component libraries. Returns a match score and the specific overrides applied.

**Reference library database:**
- Tailwind CSS (all major versions)
- shadcn/ui
- Radix UI
- Material UI / MUI
- Ant Design
- Chakra UI
- Primer (GitHub)
- Mantine
- Daisy UI
- Bootstrap

**Output example:**

```
COMPONENT LIBRARY DETECTION

Primary match:   Tailwind CSS v3       — 84% confidence
Secondary match: shadcn/ui default     — 71% confidence

Tailwind overrides detected:
  colors.primary:  #6366f1  (default: #3B82F6)
  borderRadius.md: 8px      (default: 6px)
  fontFamily.sans: Manrope  (default: Inter / system)

shadcn components detected:
  Button, Card, Badge, Input, Dialog, Dropdown

Custom tokens (not in base library):
  --color-accent: #00FF87
  --shadow-glow:  0 0 30px rgba(0,255,135,0.2)
```

This feature alone replaces hours of manual reverse engineering on every new project.

---

### 3. Token Health Score

Subsrf Scan analyses the extracted token set for internal consistency and flags problems. Returns a numeric score (0–100) and a categorised issue list.

**What is scored:**

| Check | Pass condition | Severity if failing |
|---|---|---|
| Color count | < 20 unique colors in core palette | Warning |
| Near-duplicate colors | No two text colors within ΔE < 8 | Warning |
| Spacing grid adherence | > 90% of spacing values on detected base unit | Critical |
| Type scale ratio | Adjacent sizes differ by ≥ 1.2× | Warning |
| Contrast — text on bg | WCAG AA (≥ 4.5:1) for all text/bg pairs | Critical |
| Contrast — large text | WCAG AA (≥ 3:1) for font-size > 18px | Critical |
| Shadow elevation logic | Shadows increase in blur with usage depth | Warning |
| Radius consistency | ≤ 4 distinct radius values in core use | Info |
| Transition consistency | ≤ 3 distinct duration values | Info |
| Font weight coverage | At least regular + medium or semibold | Info |

**Output example:**

```
HEALTH SCORE: 74 / 100

CRITICAL  2 issues
  ✗ Text contrast: --color-text-muted on --color-bg-surface = 3.1:1 (WCAG AA requires 4.5:1)
  ✗ Spacing: 7 values outside 4px grid (11px, 13px, 18px, 22px, 26px, 38px, 54px)

WARNING  4 issues
  ⚠ Near-duplicate colors: #6B6B7A and #7C7FA8 are ΔE 4.2 apart — consider merging
  ⚠ Near-duplicate colors: #F2F2F4 and #F0F0F4 are ΔE 0.8 apart — likely a rounding error
  ⚠ Type scale: 14px and 15px are too close (ratio 1.07) — remove one
  ⚠ 6 radius values in core use — consider consolidating to 4

INFO  3 issues
  · No italic weight detected — may limit typographic flexibility
  · Letter spacing used inconsistently across heading levels
  · Transition durations: 4 distinct values — consider reducing to 3
```

Every agency, every QA workflow, and every design system migration starts with this score.

---

### 4. Token Diff

Compare two URLs — or two historical scans of the same URL — and get a structured diff showing exactly what changed.

**Use cases:**
- Staging vs production: catch unintended visual regressions before deploy
- Before vs after a rebrand: document exactly what changed
- Your site vs a competitor's: understand the design distance
- This week vs last week: continuous design system monitoring

**Output example:**

```
TOKEN DIFF — subsrf.dev vs linear.app

COLORS  8 differences
  + color/accent:        #00FF87      (linear: #5E6AD2)
  ~ color/text/primary:  #F2F2F4      (linear: #F2F2F2)  ΔE 0.3 — near identical
  ~ color/bg/surface:    #111118      (linear: #1A1A1A)   ΔE 2.1
  - color/warning:       #FFB020      (linear: not present)

TYPOGRAPHY  3 differences
  ~ font/family/display: Manrope      (linear: Inter)
  ~ font/size/2xl:       28px         (linear: 24px)
  = font/size/base:      16px         (linear: 16px)      identical

SPACING  2 differences
  = base-unit:           4px          (linear: 4px)       identical
  ~ space/12:            48px         (linear: 40px)

RADIUS  0 differences

OVERALL DISTANCE  34/100
(0 = identical systems · 100 = completely different)
```

---

### 5. Design System Critique (Gemini)

Subsrf Scan sends the full token set to Gemini 1.5 Flash with a structured prompt that asks for a professional design system critique. Returns specific, actionable feedback — not generic observations.

**What the critique covers:**
- Type scale logic and readability at each size
- Color palette coherence and brand personality
- Spacing system completeness — missing values, outliers
- Dark/light mode parity — values that don't translate well
- Overall design system maturity assessment

**Output example:**

```
DESIGN SYSTEM CRITIQUE — subsrf.dev
Generated by Gemini 1.5 Flash

STRENGTHS
The 4px grid is strictly followed across all spacing and radii — this is
well-disciplined. The two-font system (Manrope + Azeret Mono) creates a
clear semantic split between UI text and data/code content. The accent
color (#00FF87) is used with restraint — only 89 of 1,200+ elements, which
preserves its signal value.

TYPE SCALE
The scale (12/14/16/18/22/28/40) is sound up to 28px but jumps sharply to
40px with nothing at 32–36px. This creates a gap for section headings that
likely forces designers to use 28px too often. Adding a 34px step would
complete the scale.

COLORS
The near-duplicate greys (#6B6B7A and #7C7FA8) suggest these emerged
organically rather than by design. Consolidate to one secondary text color.
The absence of a dedicated disabled state color (currently opacity-based)
will cause maintenance issues as the product scales — consider a discrete
token.

SPACING
Seven values outside the 4px grid point to padding decisions made without
the system in mind — likely in older components. These are worth
systematizing in the next pass.

OVERALL ASSESSMENT
This is a mature, opinionated dark-first system with strong discipline in
the core tokens. The rough edges are in secondary colors and edge-case
spacing — expected in a system built incrementally. Estimated design system
maturity: 7/10.
```

---

### 6. Token Improvement Suggestions (Gemini)

More specific than the critique — Gemini generates concrete replacement values for detected problems.

**Output example:**

```
TOKEN IMPROVEMENT SUGGESTIONS — subsrf.dev

1. MERGE NEAR-DUPLICATE GREYS
   Current:   --color-text-muted: #6B6B7A  (312 uses)
              --color-text-subtle: #7C7FA8  (186 uses)
   Suggested: Keep #7C7FA8 as the single secondary text color.
              Replace all #6B6B7A instances.
   Reason:    ΔE 4.2 — imperceptible difference at body text sizes.

2. COMPLETE TYPE SCALE
   Current scale: 12 / 14 / 16 / 18 / 22 / 28 / 40px
   Add:           34px between 28 and 40
   Token name:    --text-3xl: 34px
   Reason:        Current gap forces overuse of 28px for section headings.

3. FIX CONTRAST FAILURE
   Current:  --color-text-muted (#7C7FA8) on --color-bg-surface (#111118)
             Contrast ratio: 3.1:1  ← WCAG AA fail for body text
   Suggested: Lighten to #9090B0
             Contrast ratio: 4.6:1  ← WCAG AA pass
   Hex diff:  Lightness +12%  ·  Hue unchanged

4. RATIONALISE SPACING OUTLIERS
   Values outside 4px grid: 11 / 13 / 18 / 22 / 26 / 38 / 54px
   Replace with nearest grid value:
     11px → 12px  ·  13px → 12px  ·  18px → 16px or 20px
     22px → 20px  ·  26px → 24px  ·  38px → 40px  ·  54px → 56px
```

---

### 7. Natural Language Query (Gemini)

Ask questions about the token set in plain English. Gemini reads the full extracted data and answers.

**Example queries:**

```
"What color does this site use for interactive elements?"
→ The primary interactive color is #00FF87 (color/accent), used on
  89 elements including buttons and active state indicators. There is
  also a secondary interactive color, #818cf8, used on 23 elements
  primarily in hover states.

"What's the smallest readable text size?"
→ The smallest text is 10px (--text-xs), used for badge labels and
  metadata. At this size the font weight is 500 or 600, which is
  appropriate — lighter weights would likely fail readability at 10px.

"Does this site use a grid system?"
→ Yes. The spacing system is based on a 4px grid. 94% of all spacing
  values are exact multiples of 4px. The base unit token is --space-1: 4px.

"How accessible is this design?"
→ 2 contrast failures detected. The secondary text color (#7C7FA8) on
  the main surface (#111118) returns 3.1:1 — below WCAG AA's 4.5:1
  requirement for normal text. All other text/background pairs pass.
```

---

### 8. Brand Coherence Score (Gemini)

A single 0–100 score assessing whether the extracted token set reads as a coherent, intentional brand — not just whether it's technically consistent.

**What is assessed:**
- Color harmony — do the palette colors work together visually?
- Type personality — do the font choices reinforce the product's tone?
- Radius personality — sharp (technical/serious) vs round (friendly/consumer)?
- Spacing density — tight (data-heavy) vs open (editorial/marketing)?
- System intentionality — does this look designed or accumulated?

**Output example:**

```
BRAND COHERENCE SCORE: 82 / 100

PERSONALITY READS AS:
  Technical · Professional · Dark-native · Developer-tool
  Confident without being cold

COLOR HARMONY: 88/100
  Analogous palette centered on cool near-blacks with a single warm-green
  accent. High internal harmony. The accent sits in clear visual contrast
  to every surface color — strong signal design.

TYPOGRAPHY PERSONALITY: 78/100
  Manrope gives a humanist warmth that slightly softens the technical
  aesthetic — appropriate for a developer tool that wants to feel
  approachable. The mono font pairing reinforces the data-oriented nature
  of the product. Recommend exploring a slightly heavier display weight
  to add more authority at large sizes.

RADIUS PERSONALITY: 90/100
  8px default radius signals "modern SaaS" — neither sharp enough to feel
  legacy nor round enough to feel consumer. Consistent application.

SPACING DENSITY: 75/100
  Medium density — enough whitespace for clarity, not so much it feels
  sparse. Appropriate for a tool interface. The 7 off-grid values reduce
  this score.

OVERALL: This reads as an intentionally crafted system. Not accumulated.
The rough edges (near-duplicate greys, off-grid spacing) are visible under
analysis but do not materially harm the brand perception.
```

---

### 9. Figma Library Creation

Take any Scan result and create a full Figma library from it — Color Styles, Text Styles, and Variables — via the Figma REST API. No copy-paste. No manual recreation.

**What gets created in Figma:**

| Figma artifact | Source | Example |
|---|---|---|
| Color Styles | All color tokens | `text/primary`, `bg/surface`, `accent` |
| Text Styles | All typography combinations | `Display/H1`, `Body/Base`, `Mono/SM` |
| Variable Collection | All tokens as Variables | Colors, spacing, radius as Figma Variables |
| Variable Modes | Dark and light | Dual-mode where both detected |
| Effect Styles | All shadow tokens | `Shadow/SM`, `Shadow/MD`, `Glow/Accent` |

**Flow:**
1. Run a Scan on any URL
2. Connect your Figma account (OAuth)
3. Select which file to create the library in (or create a new file)
4. Click **Create Figma Library**
5. All styles and variables appear in Figma within seconds

A designer can reverse-engineer any site into a Figma starting point in one click. This is the most time-saving single action in the entire product.

**Pro only.** Requires Figma Personal Access Token stored in account settings.

---

### 10. Code Migration Assistant

For teams migrating a legacy codebase to a token-based system.

**Flow:**
1. Run a Scan on the live site — extracts all tokens
2. Upload a CSS file, a component file, or a directory (via zip)
3. Subsrf maps every hardcoded value in the uploaded code to the nearest token
4. Returns a structured migration report and a find-and-replace script

**Output example:**

```
MIGRATION REPORT — 847 replacements found in 34 files

HIGH CONFIDENCE (exact match)
  #F2F2F4  →  var(--color-text-primary)     ×  234 instances in 18 files
  #050508  →  var(--color-bg-void)           ×  89  instances in 12 files
  #00FF87  →  var(--color-accent)            ×  67  instances in 9 files
  16px     →  var(--space-4)                 ×  312 instances in 28 files

APPROXIMATE MATCH (review before replacing)
  #F2F2F3  →  var(--color-text-primary)     ×  12  instances — ΔE 0.4
  rgba(242,242,244,0.5) → var(--color-text-muted)  ×  8   instances — alpha diff 0.05

NO MATCH (new tokens needed)
  #B0B0C0  — 23 instances — no existing token within ΔE 10
  11px     — 34 instances — no grid-aligned token

GENERATED SCRIPT: migration.sh
  sed -i 's/#F2F2F4/var(--color-text-primary)/g' src/**/*.css
  sed -i 's/#050508/var(--color-bg-void)/g' src/**/*.css
  [... 845 more replacements ...]
```

**Pro only.**

---

### 11. Watch Mode

Monitor any URL on a schedule and receive alerts when tokens change.

**Use cases:**
- Brand compliance — alert if a rebrand introduces unauthorised colors
- Competitor monitoring — track design changes at competitor sites weekly
- Regression detection — alert if a deploy changes tokens unexpectedly

**Configuration:**

```
URL:          linear.app
Frequency:    Weekly (every Monday 09:00 UTC)
Alert on:     Any color change · Spacing changes > 20% · New fonts
Notify via:   Email · Slack webhook (Pro)
```

**Alert example:**

```
SCAN ALERT — linear.app changed

3 tokens changed since last scan (7 days ago)

CHANGED
  color/accent:     #5E6AD2  →  #4F5BD5   ΔE 3.2
  font/family/body: Inter    →  'Inter Variable'
  shadow/md blur:   14px     →  16px

NEW
  color/accent-hover: #6772E0  (new token, was not present)

No tokens removed.

View full diff →  scan.subsrf.dev/diff/abc123
```

**Starter:** 1 watched URL. Weekly frequency. Email only.
**Pro:** Unlimited watched URLs. Daily, weekly, or monthly. Email + Slack webhook.

---

### 12. Selector-Scoped Extraction

Instead of extracting from the full page, scope extraction to a specific element using a CSS selector.

**Use cases:**
- Extract only the navigation tokens
- Extract only card components
- Extract only form elements
- Pairs with the Subsrf Chrome extension region capture — draw a region, extract only those tokens

**Input:**

```
URL:      subsrf.dev
Selector: header.nav
```

**Output:** Full token set scoped to elements matching the selector and their descendants.

**MCP support:**

```json
{
  "name": "subsrf_extract_tokens",
  "input": {
    "url": "https://subsrf.dev",
    "selector": "header.nav",
    "format": "css"
  }
}
```

---

### 13. Public Reference Library

A curated, searchable library of Scan results from notable design systems — updated automatically via Watch Mode.

**Included sites (initial):**

| Site | Category | Last scanned |
|---|---|---|
| linear.app | Productivity SaaS | Auto-updated weekly |
| stripe.com | Fintech | Auto-updated weekly |
| vercel.com | Developer tool | Auto-updated weekly |
| notion.so | Productivity | Auto-updated weekly |
| github.com | Developer tool | Auto-updated weekly |
| figma.com | Design tool | Auto-updated weekly |
| tailwindcss.com | CSS framework | Auto-updated weekly |
| shadcn/ui | Component library | Auto-updated weekly |

**Use cases:**
- Compare your brand to Linear's token set in one click
- Use Stripe's spacing scale as a reference for your own
- Ask: "How does our type scale compare to Vercel's?" (natural language query against two scans)

**Access:** Starter and Pro. Read-only. No credit cost to view. AI queries cost 1 credit.

---

## Export Formats

All formats available to Starter and Pro. AI Prompt export costs 1 credit (Gemini).

| Format | Output | Tier |
|---|---|---|
| CSS Custom Properties | `:root { --token: value; }` | Starter + Pro |
| Tailwind Config | `tailwind.config.js` | Starter + Pro |
| JSON | Flat or nested token objects | Starter + Pro |
| Style Dictionary | W3C design token spec | Starter + Pro |
| Figma Variables | JSON for Variables API import | Starter + Pro |
| AI Prompt | Gemini-generated context summary | Starter + Pro (1 credit) |

---

## Interfaces

### Web App — scan.subsrf.dev

Primary interface. No extension required for public URLs.

- URL input → extract → visual explorer → export
- Full Scan results: tokens + health score + component detection
- AI analysis on demand: critique, improvement suggestions, brand score (credits)
- Token diff: compare any two scans
- History: last 30 scans per user
- Watch Mode: configure monitoring per URL
- Public Reference Library: browse and compare notable design systems

### MCP Tool — `subsrf_scan`

Available to Pro users via the MCP Bridge at `api.subsrf.dev`. Full Scan results available to any MCP-compatible AI client.

**Tools exposed:**

| Tool | Description | Tier |
|---|---|---|
| `subsrf_scan` | Full scan — tokens + health + component detection | Pro |
| `subsrf_extract_tokens` | Tokens only, specific format | Pro |
| `subsrf_diff` | Diff two URLs or two scan IDs | Pro |
| `subsrf_health` | Health score for a URL or scan ID | Pro |
| `subsrf_critique` | AI design critique (1 credit, Gemini) | Pro |
| `subsrf_query` | Natural language query against a scan (1 credit) | Pro |
| `subsrf_watch_status` | Get latest Watch Mode alert for a URL | Pro |

---

## Access & Tier Structure

No free tier. Subsrf Scan is included in Starter and Pro subscriptions.

| Feature | Free | Starter $9/mo | Pro $19/mo |
|---|:---:|:---:|:---:|
| **Extraction** | | | |
| Web app — scan.subsrf.dev | — | ✓ | ✓ |
| URL extraction — unlimited | — | ✓ | ✓ |
| All token types (colors, type, spacing, radius, shadows, borders, transitions, gradients, animations) | — | ✓ | ✓ |
| Dark / light mode detection | — | ✓ | ✓ |
| Selector-scoped extraction | — | ✓ | ✓ |
| **Export** | | | |
| CSS / Tailwind / JSON / Style Dictionary / Figma Variables | — | ✓ | ✓ |
| AI Prompt export (Gemini — 1 credit) | — | ✓ | ✓ |
| **Intelligence** | | | |
| Component library detection | — | ✓ | ✓ |
| Token health score | — | ✓ | ✓ |
| Design system critique (Gemini — 1 credit) | — | ✓ | ✓ |
| Token improvement suggestions (Gemini — 1 credit) | — | ✓ | ✓ |
| Brand coherence score (Gemini — 1 credit) | — | ✓ | ✓ |
| Natural language query (Gemini — 1 credit) | — | ✓ | ✓ |
| **Comparison** | | | |
| Token diff (two URLs) | — | ✓ | ✓ |
| Public reference library | — | ✓ | ✓ |
| **History & Monitoring** | | | |
| Scan history (last 30) | — | ✓ | ✓ |
| Shareable scan links | — | ✓ | ✓ |
| Watch Mode — monitored URLs | — | 1 URL · weekly | Unlimited · daily/weekly/monthly |
| Watch Mode — Slack alerts | — | — | ✓ |
| **Actions** | | | |
| Figma library creation | — | — | ✓ |
| Code migration assistant | — | — | ✓ |
| **MCP Tools** | | | |
| All `subsrf_*` MCP tools | — | — | ✓ |

---

## Credit Cost

| Action | Credits | Tier |
|---|---|---|
| URL extraction | 0 | Starter + Pro |
| All standard exports (CSS / Tailwind / JSON / etc.) | 0 | Starter + Pro |
| Component library detection | 0 | Starter + Pro |
| Token health score | 0 | Starter + Pro |
| Token diff | 0 | Starter + Pro |
| Watch Mode alerts | 0 | Starter + Pro |
| Selector-scoped extraction | 0 | Starter + Pro |
| All MCP tool calls (except AI) | 0 | Pro only |
| AI Prompt export (Gemini) | 1 | Starter + Pro |
| Design system critique (Gemini) | 1 | Starter + Pro |
| Token improvement suggestions (Gemini) | 1 | Starter + Pro |
| Brand coherence score (Gemini) | 1 | Starter + Pro |
| Natural language query (Gemini) | 1 | Starter + Pro |
| `subsrf_critique` MCP tool | 1 | Pro only |
| `subsrf_query` MCP tool | 1 | Pro only |
| Figma library creation | 0 | Pro only |
| Code migration assistant | 0 | Pro only |

Credits are shared with all Subsrf AI features. Monthly allowance: Starter 75, Pro 300.

---

## Infrastructure & Cost Model

### Stack

| Component | Technology | Host |
|---|---|---|
| Web app | Next.js | Vercel |
| Extraction service | Node.js + Playwright (headless Chrome) | Railway |
| MCP Bridge | Existing api.subsrf.dev | Railway |
| AI features | Google Gemini 1.5 Flash | Google AI |
| Watch Mode scheduler | Node.js cron | Railway |
| Reference library | Pre-scheduled scans | Railway + Supabase |
| Auth | Shared Subsrf JWT | — |
| Database | Supabase | Supabase |

### Per-extraction cost

| Component | Estimated cost |
|---|---|
| Railway CPU + memory + bandwidth | ~$0.0006 (low vol) / ~$0.00015 (high vol) |

### Gemini 1.5 Flash cost (per AI action)

All AI features use Gemini 1.5 Flash: **$0.075/1M input tokens · $0.30/1M output tokens**

| Action | Input tokens | Output tokens | Total cost |
|---|---|---|---|
| AI Prompt export | ~2,000 | ~800 | ~$0.00039 |
| Design system critique | ~3,000 | ~1,200 | ~$0.00059 |
| Improvement suggestions | ~3,000 | ~1,500 | ~$0.00068 |
| Brand coherence score | ~2,500 | ~1,000 | ~$0.00049 |
| Natural language query | ~2,500 | ~400 | ~$0.00031 |
| `subsrf_critique` MCP | ~3,000 | ~1,200 | ~$0.00059 |
| `subsrf_query` MCP | ~2,500 | ~400 | ~$0.00031 |
| **Average per AI action** | | | **~$0.00048** |

Credit margin on all AI actions:

| Tier | Credit value | Avg Gemini cost | Margin |
|---|---|---|---|
| Starter | $0.12 | ~$0.00048 | **~99.6%** |
| Pro | $0.063 | ~$0.00048 | **~99.2%** |

### Monthly cost scenarios

**Scenario A — 50 Starter + 10 Pro, light usage**

| Item | Monthly cost |
|---|---|
| Extractions (1,200 total) | $0.72 |
| AI actions (est. 30% of extractions = 360) | $0.17 |
| Watch Mode scans (10 Pro × 4 URLs × 4 weekly = 160) | $0.10 |
| Railway (1 worker + scheduler) | $10.00 |
| Supabase (free tier) | $0.00 |
| **Total** | **$11.00** |
| **Revenue** | (50 × $9) + (10 × $19) = $640 |
| **Margin** | **98.3%** |

**Scenario B — 200 Starter + 50 Pro, medium usage**

| Item | Monthly cost |
|---|---|
| Extractions (12,000 total) | $7.20 |
| AI actions (3,000 total) | $1.44 |
| Watch Mode scans (50 Pro × avg 5 URLs × 4 weekly = 1,000) | $0.60 |
| MCP tool calls — Pro (50 × 200 calls = 10,000) | $1.50 |
| Railway (2 workers + scheduler) | $15.00 |
| Supabase Pro | $25.00 |
| **Total** | **$50.74** |
| **Revenue** | (200 × $9) + (50 × $19) = $2,750 |
| **Margin** | **98.2%** |

**Scenario C — 500 Starter + 200 Pro, heavy usage**

| Item | Monthly cost |
|---|---|
| Extractions (50,000 total at scale cost) | $7.50 |
| AI actions (15,000 total) | $7.20 |
| Watch Mode scans (200 Pro × avg 8 URLs × 4 weekly = 6,400) | $3.84 |
| MCP tool calls — Pro (200 × 300 calls = 60,000) | $9.00 |
| Railway (4 workers + scheduler) | $20.00 |
| Supabase Pro | $25.00 |
| **Total** | **$72.54** |
| **Revenue** | (500 × $9) + (200 × $19) = $8,300 |
| **Margin** | **99.1%** |

### Rate limits

| Tier | Extractions / day | Concurrent | Watch URLs | AI actions / day |
|---|---|---|---|---|
| Starter | 50 | 1 | 1 | 20 |
| Pro | 200 | 3 | Unlimited | 100 |

---

## What Subsrf Scan Does Not Extract

- **Keyframe animation definitions** — `@keyframes` bodies. Running animation state is captured via Web Animations API. The `@keyframes` definition itself is not.
- **SVG presentation attributes** — `fill` and `stroke` set as HTML attributes rather than CSS
- **Print styles** — `@media print` not evaluated
- **JavaScript-driven styles set after initial render** — web app captures initial state. Chrome extension captures live DOM.
- **Font files** — family names extracted; font files not downloaded

---

## Comparison to Existing Tools

| Tool | How it works | Gap vs Subsrf Scan |
|---|---|---|
| Chrome DevTools | Manual per-element inspection | No extraction, no export, no analysis |
| Zeplin / Storybook | Requires source integration | Can't read a live external site |
| Chromatic | Screenshot visual testing | Not token extraction |
| Token Farmer (browser ext) | CSS file parsing | Raw CSS only, no computed values, no analysis |
| Figma Inspect | Reads Figma source | Only works if you have the file |
| Any CSS auditing tool | Parses stylesheets | Pre-render only, no design intelligence |

Subsrf Scan is the only tool that reads **computed values** from **any live URL**, produces a **health score and critique**, **detects the component library**, compares **two sites against each other**, monitors for **changes over time**, creates a **Figma library** from the result, and exposes everything via **MCP to any AI client** — with no source access required.

---

## Token Naming Conventions

```
category / role / variant

color/text/primary
color/text/muted
color/bg/surface
color/bg/void
color/accent
color/status/success
space/4
space/8
radius/sm
radius/md
shadow/sm
shadow/md
shadow/glow/accent
font/family/display
font/family/mono
font/size/base
font/size/lg
font/weight/bold
anim/duration/fast
anim/ease/spring
```

---

## Implementation Phases

Each phase is independently deployable and testable. Built for AI-assisted implementation.

---

### Phase 1 — Core Extraction Engine

Upgrade existing Tokens extraction service with animation support and selector scoping.

**New in this phase vs Tokens v1:**
1. Add `document.getAnimations()` pass after `getComputedStyle()` — extract duration, easing, delay, fill mode per animation. Deduplicate and name.
2. Add optional `selector` parameter to `POST /extract` — scope `querySelectorAll` to matching elements only
3. Update token JSON schema to include `animations` category
4. Update all format transformers to include animation tokens

**Unchanged from Tokens v1:** core extraction pipeline, deduplication, naming, dark/light mode detection, rate limiting, auth

---

### Phase 2 — Component Library Detection

**Tasks:**
1. Build reference database as JSON — one file per library containing canonical token signatures (key colors, spacing scale pattern, radius values, font families)
2. Create `detectLibrary(tokens)` function:
   - For each reference library: compute similarity score across colors (CIELAB), spacing ratios, radius values, font families
   - Return top 2 matches with confidence score
   - Identify delta tokens (values present in extraction but not in matched library)
3. Identify shadcn component usage: look for Radix UI class patterns (`radix-*`) and known shadcn class names in `document.querySelectorAll('[class]')`
4. Add `componentDetection` object to extraction result JSON
5. Render component detection panel in web app
6. Include in `subsrf_scan` MCP tool output

---

### Phase 3 — Token Health Score

**Tasks:**
1. Create `scoreHealth(tokens)` function — pure, no API call:
   - Color count check: flag if core palette > 20 colors
   - Near-duplicate detection: pairwise ΔE calculation on all colors, flag pairs < 8
   - Spacing grid adherence: for each spacing value, check `value % baseUnit === 0`. Calculate % adherence.
   - Type scale ratio: for each adjacent size pair, calculate ratio. Flag if < 1.2
   - WCAG contrast: for each text color × background color pair seen in the same element, calculate contrast ratio. Flag if < 4.5:1 (normal) or < 3:1 (large text)
   - Shadow elevation: order shadows by element depth, check blur increases monotonically
2. Assign severity per check: Critical / Warning / Info
3. Calculate score: start at 100, deduct per issue (Critical: -10, Warning: -5, Info: -2), floor at 0
4. Add `healthScore` object to extraction result
5. Render health score panel in web app — score badge + categorised issue list with fix suggestions
6. Add `subsrf_health` MCP tool

---

### Phase 4 — Token Diff

**Tasks:**
1. Create `POST /diff` endpoint accepting `{ urlA, urlB }` or `{ scanIdA, scanIdB }`
2. If URLs: run both extractions in parallel. If scan IDs: load from Supabase.
3. Create `diffTokenSets(tokensA, tokensB)` function:
   - For each category: match tokens by name
   - For matched pairs: flag as identical / changed (with ΔE or px delta) / removed
   - For unmatched: flag as added (in B) or removed (in A)
   - Calculate overall distance score (0–100)
4. Add `subsrf_diff` MCP tool
5. Render diff view in web app: side-by-side panels per category, colour-coded additions/changes/removals
6. Shareable diff links — same mechanism as scan links

---

### Phase 5 — Gemini AI Features

All AI features use the same Gemini 1.5 Flash integration. Build as separate API routes with shared credit deduction logic.

**Shared tasks:**
1. Credit check and deduction middleware (reuse from Tokens Phase 4)
2. Response caching per token-set hash + feature type in Supabase (24h TTL)
3. Credit refund on failure

**Per-feature system prompts — create and test each:**

**Design system critique** (`POST /api/scan/critique`):
- Input: full token JSON
- System prompt: professional design system analyst, structured critique covering type scale, colors, spacing, dark/light parity, maturity score
- Max output: 1,200 tokens

**Token improvement suggestions** (`POST /api/scan/improve`):
- Input: token JSON + health score issues
- System prompt: actionable replacement values for each flagged issue, specific hex values, exact px values
- Max output: 1,500 tokens

**Brand coherence score** (`POST /api/scan/brand`):
- Input: token JSON
- System prompt: brand personality assessment across color harmony, typography personality, radius personality, spacing density, overall intentionality score
- Max output: 1,000 tokens

**Natural language query** (`POST /api/scan/query`):
- Input: token JSON + user question string
- System prompt: answer the question directly using only data in the token set, be specific and cite exact values
- Max output: 400 tokens

**Add MCP tools:** `subsrf_critique`, `subsrf_query` — both deduct 1 credit

---

### Phase 6 — Figma Library Creation

**Tasks:**
1. Figma OAuth flow — add to account settings. Store Figma access token in Supabase.
2. Create `POST /api/scan/figma-library` endpoint:
   - Accept `{ scanId, figmaFileKey }` (or create new file if null)
   - Call Figma REST API:
     - `POST /v1/files/{fileKey}/variables` — create Variable Collection named `[domain] tokens`
     - Add Variables per token, with modes for dark/light where both exist
     - `POST /v1/files/{fileKey}/styles` — create Color Styles, Text Styles, Effect Styles
   - Colors: convert hex/rgb to Figma float format before sending
   - Typography: create one Text Style per font size × font weight combination
   - Shadows: create Effect Style per shadow token
3. Progress feedback in web app — streaming updates as each category is created
4. Error handling: Figma API rate limits (300 req/min), large token sets batched
5. Pro only — check tier before allowing Figma OAuth

---

### Phase 7 — Code Migration Assistant

**Tasks:**
1. Add file upload to web app — accepts `.css`, `.scss`, `.tsx`, `.jsx`, `.vue`, `.zip`
2. For zip: extract all matching file types, concatenate with file path headers
3. Create `POST /api/scan/migrate` endpoint:
   - Parse uploaded code: extract all color values (hex, rgb, rgba, hsl), spacing values (px, rem, em), and radius values using regex + AST parsing where possible
   - For each extracted value: find nearest token using ΔE (colors) or absolute difference (spacing/radius)
   - Classify as: exact match / approximate match / no match
   - Generate sed/awk replacement script for exact matches
   - Return structured migration report
4. Render migration report in web app — grouped by confidence, downloadable script
5. Pro only

---

### Phase 8 — Watch Mode

**Tasks:**
1. Add `token_watches` table to Supabase:

```sql
create table token_watches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  url          text not null,
  frequency    text not null check (frequency in ('daily','weekly','monthly')),
  alert_on     jsonb not null,       -- { colors: true, spacing: true, fonts: true }
  notify_email boolean default true,
  slack_webhook text,                -- Pro only
  last_scan_id uuid references token_extractions,
  created_at   timestamptz default now()
);
```

2. Build Railway cron worker — runs on schedule, checks all active watches
3. For each watch: run extraction, run diff against `last_scan_id`
4. If diff has changes matching `alert_on` config: send email notification and/or Slack webhook
5. Update `last_scan_id` after each run
6. Add Watch Mode management UI in web app — list watches, add/edit/delete, view alert history
7. Starter: enforce max 1 watch, weekly frequency only
8. Add `subsrf_watch_status` MCP tool — returns latest diff for a watched URL

---

### Phase 9 — Public Reference Library

**Tasks:**
1. Add `reference_scans` table — scans marked as public reference, not tied to a user
2. Seed with initial 8 notable sites (Linear, Stripe, Vercel, Notion, GitHub, Figma, Tailwind, shadcn)
3. Set up Watch Mode entries for each reference site — weekly auto-update
4. Add Reference Library section to web app:
   - Grid of reference sites with domain, category, last updated, token count
   - Click to view full scan result (read-only)
   - Compare button — diff current user's last scan against any reference
5. No credit cost to browse. AI queries against reference scans cost 1 credit.
6. Available to Starter and Pro

---

## Appendix

### Full token JSON schema

```json
{
  "url": "https://subsrf.dev",
  "extractedAt": "2025-05-12T10:00:00Z",
  "modes": ["dark", "light"],
  "dark": {
    "colors": [
      { "name": "color/text/primary", "value": "#F2F2F4", "frequency": 847, "roles": ["text"] }
    ],
    "typography": [
      { "name": "font/family/display", "value": "Manrope, sans-serif", "frequency": 312 }
    ],
    "spacing": [
      { "name": "space/4", "value": "16px", "frequency": 156 }
    ],
    "radius": [
      { "name": "radius/md", "value": "8px", "frequency": 134 }
    ],
    "shadows": [
      { "name": "shadow/md", "value": "0 4px 14px rgba(0,0,0,0.2)", "frequency": 67 }
    ],
    "transitions": [
      { "name": "transition/base", "value": "all 200ms ease-out", "frequency": 89 }
    ],
    "animations": [
      { "name": "anim/duration/fast", "value": "150ms", "frequency": 34 },
      { "name": "anim/ease/spring", "value": "cubic-bezier(0.34,1.56,0.64,1)", "frequency": 12 }
    ]
  },
  "light": {},
  "componentDetection": {
    "primaryMatch": { "library": "Tailwind CSS v3", "confidence": 0.84 },
    "secondaryMatch": { "library": "shadcn/ui", "confidence": 0.71 },
    "detectedComponents": ["Button", "Card", "Badge", "Input", "Dialog"],
    "customTokens": ["color/accent", "shadow/glow/accent"]
  },
  "healthScore": {
    "score": 74,
    "critical": 2,
    "warnings": 4,
    "info": 3,
    "issues": [
      { "severity": "critical", "check": "contrast", "message": "color/text/muted on color/bg/surface = 3.1:1 (WCAG AA fail)" }
    ]
  },
  "meta": {
    "baseUnit": 4,
    "hasDarkMode": true,
    "hasLightMode": true,
    "totalTokens": 47,
    "extractionMs": 1240
  }
}
```

### Environment variables (additions to Tokens v1)

```bash
# New in Scan
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
WATCH_MODE_CRON=0 9 * * 1      # Monday 09:00 UTC
REFERENCE_LIBRARY_CRON=0 6 * * 1
SLACK_SIGNING_SECRET=           # For Slack webhook verification
```

---

*scan.subsrf.dev · Subsrf Inc. · v2.0 spec · 2025 · Confidential*
