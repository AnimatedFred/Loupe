# Subsrf Canvas

> The design tool for the AI era. Design. Collaborate. Ship.

**Product:** Subsrf Canvas
**Type:** Standalone web application — flagship Subsrf product
**Domain:** canvas.subsrf.dev
**Status:** Pre-build — v1.0 spec
**Date:** 2025

---

## What is Subsrf Canvas?

Subsrf Canvas is an infinite design-to-code workspace where designers and developers work on the same artifact at the same time.

Every element on the canvas has two layers: the visual design layer that designers see and edit, and the subsurface layer that developers and AI see — computed styles, token names, component structure, implementation specs, and production-ready code. These are not two separate files or two separate tools. They are the same object, seen from two angles.

AI lives natively inside the canvas. It can generate screens from a prompt, edit existing designs from instructions, read the subsurface of any element, push components to a live codebase, and participate in the design process as a collaborator — not as a chatbot in a sidebar.

The result is the first tool where a design decision and a code decision are the same decision.

---

## The Three Layers

Every element in Subsrf Canvas exists simultaneously across three layers:

**Layer 1 — Visual**
The canvas. What the designer sees and edits. Frames, components, text, images, shapes, variants, auto layout. Familiar to anyone who has used Figma.

**Layer 2 — Subsurface**
The hidden layer. Every element carries its full computed spec: exact CSS values, token references, XPath, component name, spacing from Subsrf Scan, WCAG contrast score, animation spec. This layer is always present, always accurate, never out of date.

**Layer 3 — Code**
The implementation layer. Every design decision produces a real component — React by default, Vue or HTML on request. The code updates live as the design changes. Push to GitHub with one action.

---

## Core Feature Areas

---

### 1. Infinite Canvas

The workspace. Built for speed, built for scale.

**Canvas fundamentals:**
- Infinite scrollable canvas — no artboard size limits
- Multi-page support — pages map to routes in the generated codebase
- Frames represent screens, sections, or components
- Zoom from 1% to 6400% — pixel-perfect inspection at any scale
- Minimap for navigation at large canvas scales
- Grid and guide system — snap to 4px grid by default (Subsrf base unit)
- Rulers with token-aware snapping (snaps to nearest spacing token)

**Selection and manipulation:**
- Single and multi-select
- Group and ungroup
- Layers panel with search, lock, and visibility
- Smart guides — show spacing between selected elements as token values
- Alignment tools — align to token grid, not pixel-perfect arbitrary values
- Copy, paste, duplicate with smart offset

**Frames:**
- Preset frame sizes: mobile (390×844), tablet (768×1024), desktop (1440×900), custom
- Responsive constraints: fix, scale, stretch, center
- Clip content toggle
- Background fill, border, shadow — all token-aware

---

### 2. Design Tools

The editing layer. Familiar to Figma users, extended with AI and token intelligence.

**Drawing tools:**
- Rectangle, Ellipse, Line, Arrow, Polygon, Star
- Vector pen tool with bezier handles
- Text tool — full typography controls
- Image: upload, URL, or AI-generated
- Component instance placement

**Auto Layout:**
- Horizontal, vertical, and grid layout modes
- Gap, padding, alignment — all token-snapping
- Min/max width and height constraints
- Absolute positioning within auto layout containers
- Wrap mode for responsive grids

**Styles:**
- Fill: solid color, gradient (linear/radial/angular), image
- All color pickers show token name if value matches a token
- Stroke: color, weight, position, dash patterns
- Effects: drop shadow, inner shadow, blur, background blur
- All effect values token-snapping where applicable
- Typography: font family, size, weight, line height, letter spacing, alignment, decoration — all token-aware

**Components:**
- Create component from any frame or group
- Component library panel — all components in the current file
- Variants — define variant properties and values
- Interactive component states: default, hover, focus, active, disabled
- Component documentation field — attached to the implementation spec

**Token panel:**
- All design tokens from the current file
- Import tokens from Subsrf Scan (any URL)
- Apply any token to any style property via the token panel
- Tokens shown inline in the properties panel when a value matches
- Token health score for the current file (from Subsrf Scan engine)

---

### 3. AI Generation

The generative layer. AI as a collaborator, not a chatbot.

**AI generation modes:**

**Screen generation**
Describe a screen in plain language. AI generates a complete frame — layout, components, typography, color — using the current file's token set as the design system constraint.

```
"Create a dashboard overview page with a metrics row,
 a recent activity feed, and a quick actions panel.
 Dark theme. Match the existing design system."

→ Complete 1440px frame generated in ~8 seconds
→ All colors reference existing tokens
→ All spacing on the 4px grid
→ All text using defined font styles
→ Every element is a real editable canvas node
```

**Component generation**
Select an existing frame region or describe a component from scratch.

```
"Generate a notification toast component with
 success, warning, and error variants."

→ Component with 3 variants created in the library
→ Correct token usage throughout
→ Implementation spec attached
```

**Edit from instruction**
Select any element or frame and describe the change.

```
[Selected: Hero section frame]
"Make the headline larger and add more vertical
 spacing between the headline and the subtext."

→ Font size updated to next token step
→ Gap updated to next spacing token
→ Change reflected in implementation spec immediately
```

**Design critique**
Select any frame and ask AI to review it.

```
"Review this checkout flow for accessibility and UX issues."

→ Annotated overlay showing issues
→ Severity levels: critical / warning / suggestion
→ Click any annotation to apply the fix
```

**Subsurface read**
AI can read any element's subsurface data natively. No copy-paste, no export step.

```
"What's the contrast ratio of this text on this background?"
"Which elements on this frame are not using design tokens?"
"Generate a Playwright test for the interactive elements on this page."
```

**AI panel:**
- Persistent AI chat panel (collapsible) — context-aware to current selection
- Prompt history — revisit and rerun previous prompts
- Generation queue — multiple generations running in parallel
- Undo/redo for AI-generated changes — treated identically to manual edits

---

### 4. Subsurface Panel

Every element in Subsrf Canvas carries its full subsurface data. This panel is always visible alongside the design properties.

**What the subsurface panel shows per element:**

```
ELEMENT: PrimaryButton
Component: Button / Primary
Token references:
  background     → color/accent (#00FF87)
  color          → color/bg/void (#050508)
  border-radius  → radius/sm (6px)
  padding        → space-3 space-4 (12px 16px)
  font-size      → font/size/sm (13px)
  font-weight    → font/weight/medium (500)
  font-family    → font/family/mono

CSS selector:   .btn.btn--primary
XPath:          //button[@class="btn btn--primary"]

WCAG contrast:  19.4:1 ✓ AAA pass

Implementation:
  <button class="btn btn--primary">{label}</button>

Props:
  label:    string
  onClick:  () => void
  disabled: boolean
```

**Panel features:**
- Copy any value individually
- Copy full CSS block
- Copy implementation snippet
- Open in code view
- Link to Subsrf Scan result for the same token set
- History — see how subsurface values changed over edit sessions

---

### 5. Code Layer

Every canvas element generates real, production-ready code. The code layer is not an export — it is a live mirror of the canvas.

**Code generation:**
- React + Tailwind (default)
- React + CSS Modules
- Vue 3 + Tailwind
- HTML + CSS (token variables)
- Framework selector per-file, not per-export

**Component code view:**
- Click any component in the canvas to see its generated code
- Code updates live as the design changes
- Syntax highlighting, Azeret Mono, Subsrf dark theme
- Copy button — one click to clipboard
- Diff view — shows what changed since last push

**Code panel features:**
- Toggle between JSX, CSS, and props view
- Component tree — see the full component hierarchy as code
- Import statements auto-generated
- Responsive breakpoints included if frame has responsive variants
- Accessibility attributes (aria-label, role, tabIndex) included from subsurface data

**AI code actions (1 credit each):**
- "Write tests for this component" → Playwright, Vitest, or Jest
- "Add error states" → generates error variant + updated code
- "Make this accessible" → audits and fixes WCAG issues in code
- "Convert to TypeScript" → adds full type definitions

---

### 6. Push to Code

The shipping layer. From canvas to live codebase without leaving the tool.

**GitHub integration:**
- Connect any GitHub repository
- Map canvas pages to file paths in the repo
- Push generates a branch: `subsrf/update-[component]-[timestamp]`
- Commit message auto-generated from the AI edit history
- Pull request created automatically with:
  - Screenshot of the changed frame
  - List of changed components
  - Diff of generated code
  - Subsurface change summary (which tokens changed)

**Push modes:**
- **Single component** — push one component's generated code
- **Page** — push all components on a page
- **Full sync** — push all changed components across the entire file

**File structure output:**
```
src/
  components/
    Button/
      Button.tsx
      Button.module.css  (or Button.tailwind.tsx)
      Button.stories.tsx (if Storybook enabled)
      Button.test.tsx    (if tests enabled)
    Card/
      ...
  tokens/
    tokens.css           (all design tokens as CSS variables)
    tokens.tailwind.js   (Tailwind config)
    tokens.json          (Style Dictionary format)
  pages/
    dashboard/
      page.tsx
    ...
```

**Vercel / Netlify preview:**
- After push, Canvas shows a live preview URL
- Preview updates on every push
- Comment on frames with the preview URL attached

---

### 7. Collaboration

Real-time multi-user editing. Designers and developers in the same file at the same time.

**Presence:**
- Live cursors — named, color-coded per user
- User avatars in the toolbar showing who is in the file
- Follow mode — click a user's avatar to follow their viewport
- Focus mode — hide other users' cursors temporarily

**Comments:**
- Click anywhere on the canvas to leave a comment
- Thread replies
- Resolve and reopen
- Mention collaborators: @name
- Comment on the subsurface: "This contrast ratio fails AA — we need to fix before launch"
- Comments attached to specific elements — move with the element
- Comments can trigger AI actions: "@subsrf fix the contrast on this element"

**Version history:**
- Every save creates a version checkpoint
- Named versions: "v1 — initial hero", "v2 — post-feedback"
- Restore any version
- Branch from any version
- Diff between any two versions — visual diff on canvas + code diff

**Multiplayer editing:**
- Conflict resolution: last-write-wins per property
- Locked layers: lock any element to prevent editing by others
- Edit regions: assign sections of the canvas to specific users
- Real-time via WebSockets (Liveblocks)

---

### 8. Subsrf Ecosystem Integration

Canvas is the center of the Subsrf product universe. All other Subsrf products connect here.

**Subsrf Scan:**
- Import token set from any URL directly onto the canvas
- Run a Scan from inside Canvas — apply results as the file's token set
- Health score visible in the token panel
- Diff: compare canvas tokens against any scanned site

**Subsrf Compose (Figma plugin):**
- Export any canvas component as a Subsrf Compose prompt
- Compose prompts from Canvas push to Lovable, v0, Bolt, Cursor

**MCP Bridge:**
- The entire canvas is readable by Claude via MCP
- `subsrf_canvas_get_frame` — Claude reads any frame's full structure
- `subsrf_canvas_create_component` — Claude creates a component on the canvas
- `subsrf_canvas_get_tokens` — Claude reads the file's token set
- `subsrf_canvas_push_code` — Claude triggers a code push

**Chrome Extension:**
- Capture elements from any live page → import directly onto the Canvas as editable frames
- The subsurface data from the capture populates the subsurface panel automatically

---

### 9. Asset Management

**Images:**
- Upload images — stored in Subsrf CDN
- AI image generation inline (DALL-E or Imagen)
- Unsplash integration for placeholder images
- SVG import — editable as vector paths in the canvas

**Icons:**
- Lucide, Phosphor, and Heroicons built in
- Search by name, paste as vector path
- Size and color inherit from parent token

**Fonts:**
- All Google Fonts available
- Custom font upload (WOFF2)
- Font pairing suggestions from Subsrf Scan

---

### 10. Export

For when you need files, not code.

**Design exports:**
- PNG, JPG, WebP at 1×, 2×, 3×
- SVG (flatten or preserve structure)
- PDF (single frame or multi-page)
- Annotated PNG — Subsrf-style numbered annotations with legend

**Design handoff:**
- Shareable view link — read-only canvas access, no account required
- Inspect mode on shared links — hover any element to see values
- Subsurface overlay on shared links — toggle to see token data
- Export ZIP — all assets + code + token files

**Token exports:**
- All Subsrf Scan export formats: CSS, Tailwind, JSON, Style Dictionary, Figma Variables
- AI Prompt export via Gemini (1 credit)

---

## Access & Tier Structure

Subsrf Canvas is a separate subscription from the core Subsrf extension product. It includes all Subsrf extension features.

| Feature | Free | Canvas $19/mo | Canvas Pro $49/mo |
|---|:---:|:---:|:---:|
| **Canvas** | | | |
| Infinite canvas | — | ✓ | ✓ |
| Frames and components | — | ✓ | ✓ |
| Auto Layout | — | ✓ | ✓ |
| Token panel + Subsrf Scan import | — | ✓ | ✓ |
| Files | — | 3 | Unlimited |
| Pages per file | — | 10 | Unlimited |
| **AI Generation** | | | |
| Screen generation | — | ✓ 50 gen/mo | ✓ 300 gen/mo |
| Component generation | — | ✓ | ✓ |
| Edit from instruction | — | ✓ | ✓ |
| Design critique | — | ✓ | ✓ |
| AI code actions | — | ✓ (credits) | ✓ (credits) |
| **Code Layer** | | | |
| Live code view | — | ✓ | ✓ |
| React + Tailwind output | — | ✓ | ✓ |
| Vue / HTML output | — | — | ✓ |
| TypeScript output | — | ✓ | ✓ |
| Storybook output | — | — | ✓ |
| Test generation | — | ✓ (credits) | ✓ (credits) |
| **Push to Code** | | | |
| GitHub integration | — | ✓ | ✓ |
| Auto PR creation | — | ✓ | ✓ |
| Vercel / Netlify preview | — | ✓ | ✓ |
| **Collaboration** | | | |
| Collaborators per file | — | 3 | Unlimited |
| Live cursors and presence | — | ✓ | ✓ |
| Comments | — | ✓ | ✓ |
| Version history | — | 30 days | Unlimited |
| **Subsrf Ecosystem** | | | |
| Chrome extension (all features) | — | ✓ | ✓ |
| Subsrf Scan (Starter level) | — | ✓ | ✓ Pro |
| MCP Canvas tools | — | — | ✓ |
| **Credits / month** | 0 | 150 | 500 |

---

## Credit Cost

| Action | Credits |
|---|---|
| Screen generation (AI) | 5 |
| Component generation (AI) | 2 |
| Edit from instruction (AI) | 1 |
| Design critique (AI) | 2 |
| AI code action (tests, a11y, TS) | 1 |
| AI image generation | 3 |
| Subsrf Scan AI Prompt export | 1 |
| Subsrf Scan critique / brand score | 1 |
| `subsrf_canvas_*` MCP tools | 0 |
| All other canvas actions | 0 |

---

## Infrastructure

### Stack

| Component | Technology | Host |
|---|---|---|
| Canvas web app | React + Tldraw or custom canvas engine | Vercel |
| Real-time sync | Liveblocks (presence + storage) | Liveblocks Cloud |
| Code generation service | Node.js | Railway |
| AI generation | Claude claude-sonnet-4-20250514 (layout) + Gemini (vision) | Anthropic + Google AI |
| Asset storage | Supabase Storage + Cloudflare CDN | Supabase + Cloudflare |
| GitHub integration | GitHub OAuth + REST API | GitHub |
| Vercel preview | Vercel API | Vercel |
| Database | Supabase | Supabase |
| Auth | Supabase Auth (Google OAuth) | Supabase |

### Why tldraw as canvas engine

Building a canvas engine from scratch (Figma did this) is a multi-year effort. Tldraw is an open-source infinite canvas library that provides: infinite canvas, shape primitives, selection, resize handles, keyboard shortcuts, undo/redo, and real-time collaboration hooks. Subsrf Canvas extends it with: token-aware properties panels, AI generation layer, subsurface panel, code generation, and GitHub push.

This reduces canvas engine work from 2 years to approximately 3 months of integration and extension work.

### AI generation architecture

Screen and component generation uses a two-step pipeline:

```
1. Claude (claude-sonnet-4-20250514) — receives prompt + current token set
   → returns structured component tree JSON
   (names, nesting, layout, token references, text content)

2. Canvas renderer — receives component tree JSON
   → creates canvas nodes
   → applies token values to style properties
   → generates initial code representation

Total generation time target: < 10 seconds for a full screen
```

---

## Implementation Phases

Written for AI-assisted implementation. Each phase is independently deployable.

---

### Phase 1 — Canvas Foundation

**Goal:** A working infinite canvas with frames, basic drawing tools, layers panel, and real-time collaboration.

**Tasks:**
1. Scaffold Next.js app at `canvas.subsrf.dev`
2. Integrate tldraw as the canvas engine base
3. Extend tldraw with Subsrf-branded frame tool — preset sizes, label, background
4. Build properties panel — position, size, fill, stroke, radius, opacity
5. Build layers panel — tree view, visibility, lock, rename, reorder
6. Integrate Liveblocks for real-time presence and storage
7. Build user presence UI — live cursors with name labels, avatars in toolbar
8. Supabase auth — Google OAuth, session persistence
9. File system — create, rename, duplicate, delete files. 3 files max for Canvas tier.
10. Page system — add, rename, reorder pages within a file
11. Keyboard shortcuts — standard canvas shortcuts (V, R, T, A, space-drag, cmd-Z)
12. Export: PNG and SVG from any frame

---

### Phase 2 — Design Tools and Token System

**Goal:** Full design tool suite with token-aware properties and Subsrf Scan integration.

**Tasks:**
1. All drawing tools: Rectangle, Ellipse, Line, Arrow, Pen, Text, Image
2. Auto Layout engine — horizontal, vertical, grid, wrap modes
3. Typography controls — font family, size, weight, line height, letter spacing, color, alignment
4. Component system — create component from selection, instances, override properties
5. Variant system — define variant properties (State, Size, etc.) and values
6. Token panel — display all tokens in file, grouped by category
7. Token-aware color picker — shows token name if value matches a token
8. Token-aware spacing — properties panel shows token name next to px value
9. Token import from Subsrf Scan — enter URL, tokens extracted and applied to file
10. Token health score — runs Subsrf Scan health check on current token set
11. Smart guides — spacing between elements shown as token names, not pixel values
12. Grid snap — snaps to 4px grid by default, configurable

---

### Phase 3 — Subsurface Panel and Code Layer

**Goal:** Every canvas element has a live subsurface panel. A code view shows generated React + Tailwind for every component.

**Tasks:**

**Subsurface panel:**
1. Build subsurface panel UI — sits alongside the design properties panel
2. For every selected element: compute and display CSS selector, XPath, token references, WCAG contrast, implementation snippet
3. Token reference resolver — map every style value to its token name
4. WCAG contrast calculator — compute ratio for text/background pairs in selection
5. Implementation snippet generator — produce JSX + Tailwind class string for element
6. Props definition — infer props from component variants and text layers
7. Copy individual values, copy full CSS, copy JSX snippet

**Code layer:**
1. Code generation service (Railway Node.js) — accepts component tree JSON, returns React + Tailwind code
2. Component code view panel — click any component, see its code
3. Live code updates — code regenerates within 500ms of any design change
4. JSX view / CSS view / Props view tabs
5. Syntax highlighting — Azeret Mono, Subsrf token colors for keys/values
6. Copy button per code view
7. Diff view — highlight what changed since last push

---

### Phase 4 — AI Generation

**Goal:** AI that generates complete screens and components on the canvas from prompts, using the current token set.

**Tasks:**

1. Build AI panel UI — collapsible right sidebar, persistent chat, context-aware to selection
2. Claude integration — `claude-sonnet-4-20250514` via Anthropic API
3. Token context injection — every AI call receives the current file's full token set as system context
4. Screen generation pipeline:
   - User enters prompt in AI panel
   - Claude returns structured JSON component tree
   - Canvas renderer creates nodes from JSON
   - Token values applied to style properties
   - Frame appears on canvas
5. Component generation — same pipeline scoped to a single component
6. Edit from instruction — user selects element(s), enters instruction, Claude patches the component tree JSON for selected nodes only
7. Design critique — Claude receives frame as image (via `captureVisibleTab` equivalent) + subsurface data, returns annotated feedback JSON, Canvas renders annotation overlays
8. AI undo/redo — AI-generated changes are undo-able identically to manual edits
9. Generation queue — allow multiple generations to run in parallel, show progress per job
10. Credit deduction — check and deduct credits before each AI action, refund on failure

---

### Phase 5 — Push to Code

**Goal:** Connect any canvas file to a GitHub repository. Push changes as branches with auto-generated PRs.

**Tasks:**

1. GitHub OAuth integration — connect GitHub account in settings
2. Repository selector — link a repo to the current file
3. Path mapper — map canvas pages to file paths in the repo
4. Code generation service upgrade — generate full file structure (component file + styles + stories if enabled)
5. `POST /api/canvas/push` endpoint:
   - Accept `{ fileId, scope: 'component' | 'page' | 'full', repoId, accessToken }`
   - Generate code for scope
   - Create branch: `subsrf/[component-name]-[timestamp]`
   - Commit files via GitHub API
   - Create PR with: frame screenshot, changed component list, code diff, subsurface change summary
6. Push history — list of all pushes with branch link, PR link, timestamp
7. Vercel integration — after push, retrieve preview URL and display in Canvas
8. Netlify integration — same flow for Netlify deploys

---

### Phase 6 — Collaboration Features

**Goal:** Full multi-user real-time editing with comments, version history, and follow mode.

**Tasks:**

1. Comment system:
   - Click anywhere on canvas to create comment anchor
   - Thread replies with @mentions
   - Resolve / reopen
   - Comments attached to canvas elements — move with element
   - Comment panel — list all open comments, click to jump to location
2. Follow mode — click collaborator avatar to follow their viewport in real time
3. Focus mode — toggle off other users' cursors
4. Version history:
   - Auto-checkpoint every 10 minutes + on manual save
   - Named versions: "Save version" button with name field
   - Version list in file menu — click to preview, click to restore
   - Branch from version — creates a copy at that checkpoint
5. Locked layers — lock icon in layers panel, locked elements show warning when clicked
6. Edit regions (Pro) — assign a canvas region to a specific user, others see a lock

---

### Phase 7 — Subsrf Ecosystem Integration

**Goal:** Connect Canvas to the full Subsrf product suite via MCP Bridge, Chrome extension, and Scan.

**Tasks:**

**MCP Bridge tools:**
1. Register `subsrf_canvas_get_frame` — returns full component tree JSON for a named frame
2. Register `subsrf_canvas_create_component` — accepts component tree JSON, creates on canvas
3. Register `subsrf_canvas_get_tokens` — returns current file token set
4. Register `subsrf_canvas_push_code` — triggers code push for a scope
5. All tools: Pro only, JWT auth, file access permission check

**Chrome extension integration:**
1. "Import to Canvas" button in extension sidebar — when elements are captured, option to open Canvas and import
2. Import creates a new frame on the canvas with captured elements as editable nodes
3. Subsurface data from capture populates subsurface panel automatically

**Scan integration:**
1. "Import from URL" in token panel — runs Subsrf Scan, imports result as file token set
2. "Compare to live site" — runs Scan on connected site, diffs against current canvas tokens
3. Health score widget in token panel — reflects current token health

---

## Appendix

### Component tree JSON schema (AI generation output)

```json
{
  "name": "DashboardOverview",
  "type": "FRAME",
  "width": 1440,
  "height": 900,
  "layout": { "mode": "VERTICAL", "gap": 32, "padding": [48, 48, 48, 48] },
  "fill": { "token": "color/bg/void", "value": "#050508" },
  "children": [
    {
      "name": "MetricsRow",
      "type": "FRAME",
      "layout": { "mode": "HORIZONTAL", "gap": 24 },
      "children": [
        {
          "name": "MetricCard",
          "type": "COMPONENT_INSTANCE",
          "component": "MetricCard",
          "props": { "title": "Elements captured", "value": "12,847", "trend": "+12%" }
        }
      ]
    },
    {
      "name": "HeroHeadline",
      "type": "TEXT",
      "characters": "What lives beneath.",
      "style": {
        "fontFamily": { "token": "font/family/display", "value": "Manrope" },
        "fontSize": { "token": "font/size/4xl", "value": "60px" },
        "fontWeight": 800,
        "color": { "token": "color/text/primary", "value": "#F2F2F4" }
      }
    }
  ]
}
```

### MCP config for Canvas (Pro)

```json
{
  "mcpServers": {
    "subsrf": {
      "command": "npx",
      "args": ["-y", "subsrf-intelligence", "--endpoint", "https://api.subsrf.dev"]
    }
  }
}
```

### Environment variables

```bash
# Canvas web app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
LIVEBLOCKS_SECRET_KEY=
ANTHROPIC_API_KEY=          # For AI generation
GEMINI_API_KEY=              # For vision-based critique
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
VERCEL_ACCESS_TOKEN=
CODE_GEN_SERVICE_URL=        # Railway code generation service

# Code generation service (Railway)
SUPABASE_SERVICE_KEY=
JWT_SECRET=
```

---

*canvas.subsrf.dev · Subsrf Inc. · v1.0 spec · 2025 · Confidential*
