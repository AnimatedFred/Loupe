# Subsrf Compose — Feature Requirements

> Generate implementation-ready AI prompts directly from Figma selections.

**Feature name:** Subsrf Compose
**Surface:** Figma Plugin — Compose tab
**Version:** 1.0 spec
**Status:** Pre-build
**Date:** 2025

---

## 1. Overview

Subsrf Compose is a tab inside the Subsrf Figma Plugin that reads any selected frame, component, or group on the Figma canvas and generates a structured, implementation-ready prompt optimised for AI coding tools — Claude, Lovable, v0, Bolt, Cursor, or a tool-agnostic raw spec.

The designer selects a node, chooses an output target, configures options, and clicks **Compose prompt**. The plugin reads the Figma node tree via the Plugin API, sends the structured data to the Subsrf MCP Bridge, which calls Claude to produce the final prompt. The result is ready to copy or send directly.

### The problem it solves

Designers hand off to developers by sharing Figma links or screenshots. Developers either use Inspect mode (which gives fragments of data, not a build-ready spec) or describe the design in their own words (which loses precision). AI coding tools like Lovable and v0 work best with structured, value-accurate prompts — but nobody produces those today without significant manual work.

Subsrf Compose produces that prompt automatically, with exact px values, token names, variant states, and target-specific formatting.

---

## 2. Trigger & Entry Point

### 2.1 Plugin tab

Compose is the primary tab in the Subsrf Figma Plugin. It is visible as the first tab on plugin open.

**Tab label:** `Compose`

**Other tabs:** `History` · `Settings`

### 2.2 Activation condition

The Compose tab is fully active when **at least one node is selected** on the Figma canvas.

When nothing is selected:
- The selection summary shows: *"Select a frame or component to begin"*
- The **Compose prompt** button is disabled
- Target and option controls are visible but non-interactive

### 2.3 Multi-selection

When multiple nodes are selected:
- The selection summary shows: *"3 nodes selected"* with a combined chip list
- Multi-node analysis is a **Pro-only** feature
- Free and Starter users see a lock on the Compose button with an upgrade prompt

---

## 3. Selection Summary

When a node is selected, the plugin reads and displays a summary at the top of the Compose tab.

### 3.1 Data displayed

| Field | Source | Example |
|---|---|---|
| Node name | `node.name` | MetricCard |
| Node type | `node.type` | Frame · Component · Group |
| Dimensions | `node.width` × `node.height` | 380 × 140px |
| Layout | `node.layoutMode` | Auto Layout · None |
| Variant count | `node.variantProperties` | 3 variants |
| Component depth | Children count | 2 nested components |
| Dark/light mode | Background luminance heuristic | Dark mode |

### 3.2 Chips

Quick-read metadata chips displayed below the name/dimensions row:

- Variant count if > 1 — `3 variants` (green)
- Layout mode if Auto Layout — `Auto Layout` (blue)
- Nested component count if > 0 — `2 components`
- Mode if detectable — `Dark mode` · `Light mode`

### 3.3 Refresh

The summary auto-refreshes whenever the canvas selection changes. No manual refresh required.

---

## 4. Output Target

The user selects which AI tool the prompt is being written for. Each target produces a different prompt structure optimised for that tool's parsing behaviour.

### 4.1 Available targets

| Target | Icon | Notes |
|---|---|---|
| Claude | 🤖 | Structured markdown, detailed spec, all values explicit |
| Lovable | ❤️ | React + Tailwind, component-first, prop types included |
| v0 | ▲ | shadcn/ui references where applicable, Next.js-aware |
| Bolt | ⚡ | Full-stack aware, includes routing hints for page-level frames |
| Cursor | ◻ | File-path suggestions, code-continuation format |
| Raw spec | 📄 | Tool-agnostic plain English, no framework assumptions |

### 4.2 Target persistence

The selected target persists between sessions via `figma.clientStorage`. Default target is configurable in Settings.

### 4.3 Target-specific prompt differences

**Claude** prompt structure:
```
# Build prompt — Claude
## Component: [name]
## Layout
## Typography
## Colors
## Variants
## Props
## Notes
```

**Lovable** prompt structure:
```
# Build prompt — Lovable
Build a React component called [name] using Tailwind CSS.
[Flat, direct instructions optimised for Lovable's parser]
Props: { title: string, onClick: () => void, disabled?: boolean }
```

**v0** prompt structure:
```
Create a [name] component.
Use shadcn/ui [Button/Card/Badge] where applicable.
[Exact specs with Tailwind class hints]
```

**Bolt** prompt structure:
```
Build [name] as part of a Next.js application.
Route: /[inferred from frame name]
[Layout + data props + API hooks if applicable]
```

**Cursor** prompt structure:
```
// File: components/[name].tsx
// Create this component matching the Figma spec:
[Inline code comment format, ready to paste into editor]
```

**Raw spec** prompt structure:
```
COMPONENT SPECIFICATION: [name]
[Numbered paragraphs, no code, no framework assumptions]
[Suitable for any AI tool or human developer]
```

---

## 5. Property Extraction

The plugin reads the following properties from the selected Figma node and its children via the Figma Plugin API.

### 5.1 Layout

| Property | Figma API | Included in prompt |
|---|---|---|
| Width / height | `node.width`, `node.height` | ✓ Always |
| X / Y position | `node.x`, `node.y` | ✓ If relevant to layout |
| Auto Layout direction | `node.layoutMode` | ✓ If `HORIZONTAL` or `VERTICAL` |
| Gap | `node.itemSpacing` | ✓ If Auto Layout |
| Padding | `node.paddingTop/Right/Bottom/Left` | ✓ If Auto Layout |
| Alignment | `node.primaryAxisAlignItems`, `node.counterAxisAlignItems` | ✓ If Auto Layout |
| Clip content | `node.clipsContent` | ✓ If `true` |
| Min/max width | `node.minWidth`, `node.maxWidth` | ✓ If set |

### 5.2 Fills & Colors

| Property | Figma API | Notes |
|---|---|---|
| Solid fill | `node.fills[].color` | Converted to hex + rgba |
| Gradient fill | `node.fills[].gradientStops` | Converted to CSS gradient string |
| Image fill | `node.fills[].type === 'IMAGE'` | Noted as placeholder |
| Opacity | `node.opacity` | Included if < 1 |
| Blend mode | `node.blendMode` | Included if not `NORMAL` |
| Variable binding | `node.boundVariables.fills` | Token name used if bound |

### 5.3 Strokes & Borders

| Property | Figma API | Notes |
|---|---|---|
| Stroke color | `node.strokes[].color` | Converted to CSS |
| Stroke weight | `node.strokeWeight` | In px |
| Stroke position | `node.strokeAlign` | INSIDE / OUTSIDE / CENTER |
| Stroke style | `node.strokeDashes` | Dashed if set |

### 5.4 Effects

| Property | Figma API | Notes |
|---|---|---|
| Drop shadow | `node.effects[].type === 'DROP_SHADOW'` | Converted to CSS box-shadow |
| Inner shadow | `node.effects[].type === 'INNER_SHADOW'` | Converted to inset box-shadow |
| Layer blur | `node.effects[].type === 'LAYER_BLUR'` | Converted to CSS filter: blur() |
| Background blur | `node.effects[].type === 'BACKGROUND_BLUR'` | backdrop-filter: blur() |

### 5.5 Corner Radius

| Property | Figma API | Notes |
|---|---|---|
| Uniform radius | `node.cornerRadius` | Single value in px |
| Per-corner radius | `node.topLeftRadius` etc. | All four values if different |

### 5.6 Typography (TextNode)

| Property | Figma API | Notes |
|---|---|---|
| Font family | `node.fontName.family` | |
| Font style | `node.fontName.style` | Bold, Medium, etc. → weight number |
| Font size | `node.fontSize` | In px |
| Line height | `node.lineHeight` | px or % |
| Letter spacing | `node.letterSpacing` | px or em |
| Text align | `node.textAlignHorizontal` | left / center / right |
| Text case | `node.textCase` | UPPER / LOWER / TITLE |
| Text content | `node.characters` | Included as example text |
| Variable binding | `node.boundVariables.fontSize` etc. | Token name used if bound |

### 5.7 Component Variants

| Data | Source | Notes |
|---|---|---|
| Variant properties | `node.variantProperties` | e.g. `{ State: 'Default', Size: 'md' }` |
| All variant nodes | `node.parent.children` (if ComponentSet) | Each variant extracted separately |
| Property differences | Delta between variants | Only changed properties included per variant |

### 5.8 Figma Variables (Token names)

When a property is bound to a Figma Variable, the token name is used in the prompt instead of the raw value:

```
Background: #131320 (color/bg-layer)    ← with variable binding
Background: #131320                      ← without variable binding
```

Token names are resolved via `node.boundVariables` and the Variables API.

---

## 6. Prompt Generation

### 6.1 Pipeline

```
Plugin reads Figma node tree
        ↓
Structured node data JSON assembled
        ↓
Sent to Subsrf MCP Bridge (api.subsrf.dev)
        ↓
Bridge calls Claude API with:
  - System prompt: target-specific prompt engineer
  - User message: structured node JSON
        ↓
Claude returns formatted implementation prompt
        ↓
Prompt displayed in plugin result view
```

### 6.2 System prompts per target

Each target has a dedicated system prompt that instructs Claude how to format the output. These are maintained server-side on the MCP Bridge and updated independently of the plugin.

Example system prompt for Lovable target:

```
You are an expert at writing prompts for Lovable, an AI app builder.
Given a JSON description of a Figma component, write a Lovable-optimised
build prompt in plain English with React + Tailwind CSS.

Rules:
- Lead with the component name and a one-line description
- Use exact px values from the node data
- Reference Figma token names in parentheses where available
- Include all variants as named sections
- List all required props with TypeScript types
- Be direct and specific — Lovable works best with precise instructions
- End with any implementation notes
```

### 6.3 Live preview

Before clicking Compose, a **live preview** is shown in the plugin. This is a lightweight client-side preview generated without an API call — it uses the raw extracted values formatted into a template. It gives the designer a sense of the output without spending a credit.

The live preview is marked `PREVIEW` and updates in real time as options change.

### 6.4 Result display

After the API call completes, the result view shows:

- The full formatted prompt in a scrollable monospaced view
- Chips showing: target, framework, variant count, credits used
- **Copy prompt** button — one click to clipboard
- **Open in Claude** — deep link to `claude.ai/new?q=[encoded prompt]`
- **Back** button — return to compose view without losing the result

---

## 7. Options

### 7.1 Available options

| Option | Default | Tier | Description |
|---|---|---|---|
| Include all variants | On | Starter + Pro | Extracts and includes all variant states |
| Use token names | On | Starter + Pro | Uses Figma Variable names where bound |
| Include children | Off | Starter + Pro | Includes nested component specs |
| Variant-aware analysis | Off | **Pro only** | Full per-variant property diff |
| Responsive spec | Off | **Pro only** | Includes breakpoint behaviour from frame variants |
| Multi-component | Off | **Pro only** | Batch analyse multiple selected nodes |

### 7.2 Locked option behaviour

When a user on Free or Starter clicks a Pro-locked option:
- A modal appears explaining the feature and linking to the upgrade page
- The toggle does not change state
- The modal can be dismissed without upgrading

### 7.3 Option persistence

Options persist per user per file via `figma.clientStorage`. Changing target does not reset options.

---

## 8. History

The History tab shows the last 20 prompts generated in the current Figma file.

### 8.1 History entry data

Each entry shows:
- Component name
- Target used
- Variant count
- Credits consumed
- Relative timestamp (just now / 2h ago / yesterday)

### 8.2 History actions

- Click an entry to load the result view with that prompt
- Long-press (or right-click) to delete a history entry
- History is per-file and per-user, stored in `figma.clientStorage`

### 8.3 Multi-component entries

If a multi-component prompt was generated (Pro), the entry shows the count: *"3 components · Pro"*

---

## 9. Credit System

### 9.1 Cost per action

| Action | Credits | Notes |
|---|---|---|
| Live preview (client-side) | 0 | No API call |
| Single-node Compose (any target) | 1 | One Claude API call |
| Multi-node Compose (Pro) | 1 per node | Batched in one call where possible |
| Re-generate with different target | 1 | New API call required |
| Copy / re-use existing result | 0 | No new API call |

### 9.2 Credit display

The credit balance is shown in the bottom bar of the plugin at all times:

```
credits remaining     73
```

The number updates immediately after a successful generation.

### 9.3 Zero credits

When a user has 0 credits:
- The Compose button shows: *"0 credits — top up"*
- Clicking it opens the Subsrf account page
- Live preview still works (no credit cost)
- History browsing still works

### 9.4 Credit refund

If the API call fails for any reason (timeout, server error, Claude error):
- The credit is automatically refunded
- The user sees an error message with a retry button
- No credit is permanently lost

---

## 10. Tier Gating

### 10.1 Feature access by tier

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Compose tab visible | ✓ | ✓ | ✓ |
| Live preview (client-side) | ✓ | ✓ | ✓ |
| Single-node compose | — | ✓ | ✓ |
| All output targets | — | ✓ | ✓ |
| Include all variants option | — | ✓ | ✓ |
| Use token names option | — | ✓ | ✓ |
| Include children option | — | ✓ | ✓ |
| Open in Claude deep link | — | ✓ | ✓ |
| History tab (last 20) | — | ✓ | ✓ |
| Variant-aware analysis | — | — | ✓ |
| Responsive spec option | — | — | ✓ |
| Multi-node compose | — | — | ✓ |
| Prompt saved to Subsrf library | — | — | ✓ |
| Credits / month | 0 | 75 (shared) | 300 (shared) |

> Credits are shared across all Subsrf features — Compose draws from the same 75 (Starter) or 300 (Pro) monthly pool as Studio AI analysis.

### 10.2 Free tier experience

Free users can open the plugin and see the Compose tab. They can:
- View the selection summary
- See the live preview (client-side, no credit)
- Browse available targets and options
- See what the result would look like (blurred/locked result sample)

They cannot generate a prompt. Clicking Compose shows:

> *"Compose requires Subsrf Starter. Upgrade to generate implementation-ready prompts from your Figma components."*
> **Upgrade to Starter — $9/mo**

### 10.3 Starter tier upgrade triggers

A Starter user sees a Pro lock when they try to:
- Enable **Variant-aware analysis** toggle
- Enable **Responsive spec** toggle
- Select multiple nodes and click Compose
- View a history entry that was generated with Pro features

### 10.4 Lock modal content

```
🔒 Pro feature

[Feature name] is available on Subsrf Pro.

Upgrade for variant-aware analysis, multi-component
prompts, responsive specs, and 300 credits per month.

[Upgrade to Pro — $19/mo]
[Not now]
```

---

## 11. Settings Tab

### 11.1 Account section

- User avatar (Google OAuth photo)
- Display name and email
- Current plan badge (FREE / STARTER / PRO)
- Credits remaining / monthly limit
- Credit reset date
- Upgrade / manage plan button

### 11.2 Default target

Dropdown or chip selector to set the default output target. Persists via `figma.clientStorage`.

### 11.3 Plugin preferences

| Setting | Options | Default |
|---|---|---|
| Auto-refresh selection summary | On / Off | On |
| Show live preview | On / Off | On |
| Open result in full screen | On / Off | Off |
| Default: include children | On / Off | Off |
| Default: use token names | On / Off | On |

### 11.4 Danger zone

- **Clear history** — deletes all stored prompts for this file
- **Sign out** — clears session from plugin storage

---

## 12. "Open in Claude" Deep Link

When a prompt is generated, the **Open in Claude** button creates a URL:

```
https://claude.ai/new?q=[URL-encoded prompt]
```

This opens Claude in a new browser tab with the prompt pre-filled in the message box. The user clicks send and Claude begins building the component immediately.

For Lovable, the button changes to **Open in Lovable** and links to:

```
https://lovable.dev/new?prompt=[URL-encoded prompt]
```

For v0:

```
https://v0.dev/new?prompt=[URL-encoded prompt]
```

For Bolt:

```
https://bolt.new/?prompt=[URL-encoded prompt]
```

For Cursor and Raw spec, the button shows **Copy to clipboard** only (no deep link applicable).

---

## 13. Error States

| Scenario | Message | Action |
|---|---|---|
| No selection | "Select a frame or component to begin" | None — instructional |
| Nothing selectable (locked layer) | "Selection is not readable. Try selecting a frame directly." | None |
| API timeout (>15s) | "Compose timed out. Credit refunded." | Retry button |
| Bridge offline | "MCP Bridge is offline. Check your connection." | Retry + link to status page |
| Zero credits | "No credits remaining. Resets [date]." | Upgrade / Top up button |
| Pro feature on Starter | Lock modal | Upgrade / Dismiss |
| Claude API error | "AI generation failed. Credit refunded." | Retry button |
| Node too large (> 500 children) | "Frame too complex. Try selecting a smaller component." | None |

---

## 14. Technical Constraints

### 14.1 Node limits

| Tier | Max children extracted | Max variants |
|---|---|---|
| Starter | 50 child nodes | 6 variants |
| Pro | 200 child nodes | All variants |

If a selection exceeds the tier limit, Subsrf extracts the most visually significant children (by area) and notes the truncation in the prompt.

### 14.2 Image fills

Figma image fills cannot be exported directly from the plugin without user permission. When an image fill is detected:
- The prompt notes: *"Image fill detected — replace with your asset"*
- A placeholder background color (average of the image) is used

### 14.3 Font availability

The prompt notes all font families used. If a font is not a Google Font or system font, it is flagged:
- *"Font: 'Custom Font Name' — ensure this is available in your project"*

### 14.4 Complex gradients

Gradients with more than 5 stops or using non-linear types (radial, angular) are approximated and flagged:
- *"Complex gradient — approximated as linear-gradient. See Figma for exact definition."*

---

## 15. Roadmap

### v1.0 — Launch
- Single-node compose
- 6 output targets: Claude, Lovable, v0, Bolt, Cursor, Raw
- Core options: variants, token names, include children
- Live preview (client-side)
- History tab (last 20)
- Tier gates: Free locked, Starter unlocked, Pro locked features visible
- Credit display and refund on failure
- Open in Claude / Lovable / v0 / Bolt deep links

### v1.1 — Pro features
- Variant-aware analysis (per-variant property diff)
- Multi-node compose (batch)
- Responsive spec (breakpoint variants)
- Prompt saved to Subsrf library

### v1.2 — Intelligence
- Component recognition — detect if node matches a known design system component (shadcn, Radix, Material) and hint in prompt
- Interaction hints — detect overlays, transitions, and prototype connections and include in spec
- Asset export — export image fills and icons alongside the prompt as a zip

### v1.3 — Platform
- Team shared prompt library
- Prompt versioning — track changes when a component is redesigned and a new prompt generated
- VS Code extension integration — send prompt directly to open file in Cursor or VS Code

---

## 16. Appendix

### A. JSON payload sent to MCP Bridge

```json
{
  "target": "lovable",
  "options": {
    "includeVariants": true,
    "useTokenNames": true,
    "includeChildren": false,
    "variantAware": false,
    "responsiveSpec": false
  },
  "node": {
    "name": "MetricCard",
    "type": "FRAME",
    "width": 380,
    "height": 140,
    "layoutMode": "VERTICAL",
    "itemSpacing": 16,
    "paddingTop": 20,
    "paddingRight": 20,
    "paddingBottom": 20,
    "paddingLeft": 20,
    "fills": [{ "type": "SOLID", "color": { "r": 0.075, "g": 0.075, "b": 0.125 }, "tokenName": "color/bg-layer" }],
    "strokes": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 0.07 } }],
    "strokeWeight": 1,
    "cornerRadius": 10,
    "effects": [],
    "variants": [
      { "name": "Default", "properties": {} },
      { "name": "Hover", "properties": { "border-color": "rgba(255,255,255,0.14)", "box-shadow": "0 4px 16px rgba(0,0,0,0.3)" } },
      { "name": "Disabled", "properties": { "opacity": 0.4 } }
    ],
    "children": [
      {
        "name": "Title",
        "type": "TEXT",
        "characters": "Active elements",
        "fontSize": 15,
        "fontWeight": 600,
        "fontFamily": "Manrope",
        "fills": [{ "type": "SOLID", "color": { "r": 0.94, "g": 0.94, "b": 0.957 }, "tokenName": "color/text-primary" }]
      }
    ]
  }
}
```

### B. Glossary

| Term | Definition |
|---|---|
| Compose | The act of generating an implementation-ready prompt from a Figma node |
| Live preview | Client-side prompt preview generated without an API call, shown before clicking Compose |
| Target | The AI tool the prompt is optimised for (Claude, Lovable, v0, etc.) |
| Variant-aware | Extracting and diffing all component variants to include all states in the prompt |
| Token name | The Figma Variable name bound to a property, used instead of the raw value |
| Deep link | A URL that opens an AI tool with the prompt pre-filled |
| Node limit | The maximum number of child nodes extracted per tier |

### C. Credit summary

| Action | Credits |
|---|---|
| Live preview | 0 |
| Single-node compose | 1 |
| Multi-node compose (per node) | 1 |
| Re-generate (same node, different target) | 1 |
| Re-use existing result | 0 |
| Failed generation (refunded) | 0 |

---

*subsrf.dev · Subsrf Compose v1.0 spec · 2025 · Confidential*
