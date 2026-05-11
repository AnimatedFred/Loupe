# Subsrf — Feature & Tier Documentation

> Capture any UI. Send it everywhere.

**Version:** 1.0 · **Status:** Internal — Pre-launch · **Domain:** subsrf.dev

---

## 1. Product Overview

Subsrf is a Chrome extension and developer tool that reads the subsurface layer of any webpage — computed styles, DOM structure, XPath selectors, element hierarchy — and pipes that data to wherever it needs to go: AI clients via MCP, Figma workspaces, Subsrf Studio, or plain prompt export.

The product has three surfaces: the **Chrome Extension** (capture and prompt), **Subsrf Studio** (annotation and AI analysis editor), and the **Figma Plugin** (sync and AI-driven canvas control). These are connected by the **MCP Bridge**, a cloud server that acts as the central nervous system of the pipeline.

### Tier Philosophy

- **Free** gets the full capture product with zero AI, plus Figma sync capped at 5 elements. Zero cloud cost to Subsrf.
- **Starter** unlocks Subsrf Studio and AI analysis — the image editor and vision features. Figma sync is unlimited. For individual developers and designers.
- **Pro** unlocks the MCP Bridge — Claude reading captured UI, Claude controlling Figma live. For power users and teams who need the full pipeline.

> **Key rule:** Figma Plugin sync (Extension → Figma) is available to all tiers — Free is capped at 5 elements. MCP Bridge (Claude ↔ Figma live control, Subsrf → Claude, Figma → Claude) is Pro only. Studio editor and AI analysis are Starter and above. DOM capture and raw prompt export are always Free.

---

## 2. Feature Matrix

✓ = included · — = not available · ◎ = limited

### Chrome Extension — Capture Modes

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Smart Click — select individual page elements | ✓ | ✓ | ✓ |
| Region Tool — bulk-select elements within a drawn rectangle | ✓ | ✓ | ✓ |
| Screenshot Capture — draw region, capture pixel-perfect PNG, open in Studio | — | ✓ | ✓ |
| Full Page Capture — auto-scroll entire page, stitch full-length image | — | ◎ 5/day | ✓ |
| Accessibility Audit — capture selection, open in Studio with WCAG analysis pre-run | — | ✓ | ✓ |
| Image Drop Zone — drop any image directly to Studio | — | ✓ | ✓ |

### Chrome Extension — On-Page Toolbar

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Floating Toolbar — persistent capture controls anchored to page bottom | ✓ | ✓ | ✓ |
| Element Highlights — numbered cyan highlight boxes overlaid on page | ✓ | ✓ | ✓ |
| Clear All — reset all selections in one click | ✓ | ✓ | ✓ |
| Show AI Prompt — open Prompt Studio with current selection pre-loaded | ✓ | ✓ | ✓ |
| Element count in toolbar | ◎ max 10 | ✓ | ✓ |

### Chrome Extension — Prompt Studio

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Raw UI Brief — structured plain-text prompt from selected elements | ✓ | ✓ | ✓ |
| CSS Export Mode — computed CSS rules for all selected elements | ✓ | ✓ | ✓ |
| AI Smart Prompt — Claude interprets elements, extracts design tokens, groups components | — | ✓ | ✓ |
| MCP & Figma Bridge status indicators in header | — | — | ✓ |
| Copy Output — one-click clipboard copy | ✓ | ✓ | ✓ |

### Chrome Extension — Account & Billing

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Google Sign-In — OAuth authentication | ✓ | ✓ | ✓ |
| Tier display and credit balance in popup | ✓ | ✓ | ✓ |
| Upgrade CTA for locked features | ✓ | ✓ | ✓ |

### Subsrf Studio — Editor

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Annotation Canvas — draw on any screenshot, zoom 10%–1000% | — | ✓ | ✓ |
| Drawing Tools — Rectangle, Circle, Star, Arrow, Text, Emoji, Pen | — | ✓ | ✓ |
| Configurable stroke: color, fill toggle, size (1–24px) | — | ✓ | ✓ |
| Layers Panel — select, delete, reorder drawn objects | — | ✓ | ✓ |
| Bring to Front / Send to Back | — | ✓ | ✓ |
| Zoom auto-fit on load | — | ✓ | ✓ |
| Copy annotated canvas to clipboard (PNG) | — | ✓ | ✓ |
| Download annotated canvas as PNG | — | ✓ | ✓ |

### Subsrf Studio — AI Analysis Panel

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Build Prompt — pixel-accurate implementation brief from image | — | ✓ | ✓ |
| Describe UI — semantic breakdown: components, tokens, layout, purpose | — | ✓ | ✓ |
| Accessibility Audit — WCAG 2.1 score, issues by severity, fix recommendations | — | ✓ | ✓ |
| Credit balance displayed in analysis panel | — | ✓ | ✓ |

### Figma Plugin — Authentication

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Google Sign-In — same account as extension | ✓ | ✓ | ✓ |
| Persistent session via Figma client storage | ✓ | ✓ | ✓ |
| Automatic access token refresh | ✓ | ✓ | ✓ |
| Tier badge in plugin UI | ✓ | ✓ | ✓ |

### Figma Plugin — Extension Sync

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Import from Extension — recreate captured elements as Figma frames | ◎ 5 elements | ✓ | ✓ |
| Property mapping: dimensions, position, bg, border-radius, shadows, opacity, borders | ◎ 5 elements | ✓ | ✓ |
| Flex layout mapping — direction, gap, padding, alignment | ◎ 5 elements | ✓ | ✓ |
| Typography mapping — family, weight, size, line-height, letter-spacing | ◎ 5 elements | ✓ | ✓ |
| Linear gradient support — color stops, direction, angle | ◎ 5 elements | ✓ | ✓ |
| Image fill mapping — fetch and set as Figma FILL | ◎ 5 elements | ✓ | ✓ |
| Smart Hierarchy — nest elements by geometric containment | ◎ 5 elements | ✓ | ✓ |

### Figma Plugin — AI Command Routing (Claude ↔ Figma)

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Create Frame — Claude generates frame at specified coordinates | — | — | ✓ |
| Set Text — Claude writes or updates text on any node | — | — | ✓ |
| Set Fill — Claude applies color fill to any node | — | — | ✓ |
| Move / Resize — Claude repositions and resizes nodes | — | — | ✓ |
| Delete / Clone nodes | — | — | ✓ |
| Swap Component — replace component instance with different key | — | — | ✓ |
| Query — Claude reads node properties from canvas | — | — | ✓ |
| Eval — Claude runs arbitrary write operations in plugin sandbox | — | — | ✓ |
| Bidirectional query — Claude inspects canvas and responds to data | — | — | ✓ |

### Figma Plugin — Activity Feed

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Real-time log with timestamps | ✓ | ✓ | ✓ |
| Color-coded entries: green (success), accent (AI events) | ✓ | ✓ | ✓ |

### Infrastructure — MCP Bridge

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Cloud bridge: api.subsrf.dev (Railway) | — | — | ✓ |
| `get_selected_elements` MCP tool — Claude reads captured UI | — | — | ✓ |
| AI command queue — Claude sends commands to Figma via bridge | — | — | ✓ |
| Figma query relay — bridge returns canvas state to Claude | — | — | ✓ |
| JWT auth, token refresh, tier lookup | — | — | ✓ |
| Credit tracking and atomic deduction | — | — | ✓ |
| Figma REST API relay | — | — | ✓ |
| npx MCP config (Claude Desktop / Cursor / Zed / Windsurf) | — | — | ✓ |

### Infrastructure — Figma Bridge

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| 2-second poll loop: plugin ↔ cloud server | ✓ | ✓ | ✓ |
| Extension → Figma sync (elements appear in Figma within seconds) | ◎ 5 elements | ✓ | ✓ |
| Claude → Figma command delivery | — | — | ✓ |
| Figma → Claude query results | — | — | ✓ |
| Connection status in Studio status bar and Figma activity feed | ✓ | ✓ | ✓ |

---

## 3. Tier Detail

### Free — $0 / month

Free is the complete capture product. A developer can use Subsrf every day for DOM inspection, raw prompt export, CSS extraction, and basic Figma sync without ever paying. The Free tier exists to drive adoption — every developer who installs Subsrf is a potential Starter or Pro customer.

> ✅ **Zero cost to Subsrf:** Free users never trigger an AI API call and never connect to the MCP Bridge. Figma sync uses the same bridge infrastructure as Pro but with a hard 5-element cap enforced server-side. No AI resources are consumed.

**What Free includes:**

- Smart Click and Region capture — unlimited sessions, up to 10 elements per session
- Floating on-page toolbar with element count and capture controls
- Numbered highlight boxes overlaid on selected elements
- Raw UI Brief — structured plain-text prompt from captured elements
- CSS Export Mode — computed CSS rules for all selected elements
- One-click copy to clipboard
- Figma Plugin — sync up to 5 captured elements per session into Figma
- Figma Plugin authentication (Google Sign-In, persistent session)
- Real-time activity feed in Figma plugin
- Google Sign-In and account management

**What Free does not include:**

- No Subsrf Studio (no editor, no annotation, no AI analysis)
- No Screenshot, Full Page, Accessibility Audit, or Image Drop capture modes
- No AI Smart Prompt (no Claude interpretation)
- No MCP Bridge — no connection to Claude Desktop, Cursor, Zed, or Windsurf
- No Subsrf → Claude or Figma → Claude data relay
- No Claude ↔ Figma live canvas control
- Figma sync hard-capped at 5 elements (additional elements are dropped)
- Session cap: 10 elements maximum

---

### Starter — $9 / month

Starter is for individual developers and designers who want AI-powered analysis without the full pipeline. The unlock is Subsrf Studio — the image editor and AI analysis panel — plus all capture modes that feed into it.

> 💡 **Who this is for:** A front-end developer who captures UI, annotates screenshots for bug reports, and uses AI to generate build prompts or audit accessibility. They can sync to Figma without limits but don't need Claude Desktop integration.

**Everything in Free, plus:**

- Subsrf Studio — full annotation canvas with all drawing tools and layers panel
- Screenshot Capture — draw a region, capture PNG, open in Studio
- Full Page Capture — limited to 5 per day
- Accessibility Audit capture mode — screenshot + Studio with WCAG pre-run
- Image Drop Zone — drop any image into Studio
- AI Smart Prompt — Claude interprets captured elements (costs 1 credit)
- Studio AI Analysis Panel — Build Prompt, Describe UI, Accessibility Audit
- Credit balance displayed in Studio
- Unlimited elements per session
- Figma Plugin sync — unlimited elements (no 5-element cap)
- 75 credits per month

**What Starter does not include:**

- No MCP Bridge — no connection to Claude Desktop, Cursor, Zed, or Windsurf
- No Subsrf → Claude or Figma → Claude data relay
- No Claude ↔ Figma live canvas control (Create Frame, Set Text, Move, etc.)
- No MCP / Figma Bridge status indicators in Prompt Studio header
- Full Page Capture limited to 5/day (Pro is unlimited)

---

### Pro — $19 / month

Pro is for power users, agencies, and AI-forward developers who need the full pipeline: Chrome extension, Subsrf Studio, MCP Bridge, and Figma Plugin working together. Claude can read live UI from any webpage and control Figma in real time.

> ⚡ **Who this is for:** A developer or designer using Claude Desktop or Cursor daily, who wants to point at any live UI and have Claude understand it, then reach into Figma and act on it. The full capture → AI → canvas loop.

**Everything in Starter, plus:**

- MCP Bridge — cloud server at api.subsrf.dev, full pipeline online
- Claude Desktop / Cursor / Zed / Windsurf integration via npx MCP config
- Subsrf → Claude — `get_selected_elements` MCP tool lets Claude read your live captured UI
- Figma → Claude — canvas query results relayed back to Claude for data-driven decisions
- Claude → Figma AI command routing — Create Frame, Set Text, Set Fill, Move, Resize, Delete, Clone, Swap, Query, Eval
- Bidirectional query — Claude inspects Figma canvas state before making changes
- Figma REST API relay via bridge
- MCP & Figma Bridge status indicators in Prompt Studio header
- Full Page Capture — unlimited
- 300 credits per month

---

## 4. Credit System

### 4.1 What Credits Are

Credits are the unit of access for AI-powered features. Every action that sends data to the Claude API costs credits. Actions that are purely local — DOM capture, CSS export, raw prompt, MCP bridge relay, Figma sync — cost zero credits.

Credits reset on the 1st of each calendar month at 00:00 UTC. Unused credits do not roll over. There is no overage: when credits hit zero, AI features are locked until the next reset or an upgrade.

> 🛡️ **Free tier protection:** Free users have 0 credits and cannot trigger any AI feature. They are never shown a credit deduction. There is no risk of a Free user consuming paid API resources.

### 4.2 Credit Allocation by Tier

| Tier | Credits / month |
|---|---|
| Free | 0 |
| Starter | 75 |
| Pro | 300 |

### 4.3 Credit Cost per Action

| Action | Credits | Available |
|---|:---:|---|
| Smart Click capture (DOM only) | 0 | All tiers |
| Region Tool capture (DOM only) | 0 | All tiers |
| Raw UI Brief (no AI) | 0 | All tiers |
| CSS Export Mode (no AI) | 0 | All tiers |
| MCP Bridge relay (push to AI client) | 0 | Pro only |
| Figma Plugin sync — up to 5 elements | 0 | Free (capped) |
| Figma Plugin sync — unlimited | 0 | Starter + Pro |
| AI Smart Prompt — Claude interprets captured elements | 1 | Starter + Pro |
| Studio: Build Prompt — build brief from image | 1 | Starter + Pro |
| Studio: Describe UI — semantic breakdown | 1 | Starter + Pro |
| Studio: Accessibility Audit — WCAG 2.1 analysis | 1 | Starter + Pro |
| Screenshot Capture + open in Studio (no AI) | 0 | Starter + Pro |
| Screenshot → AI analysis in Studio | 1 | Starter + Pro |
| Image Drop → AI analysis in Studio | 1 | Starter + Pro |
| Full Page Capture (no AI) | 0 | Starter + Pro |
| Full Page → AI analysis in Studio | 2 | Pro only |
| Accessibility Audit capture mode → Studio WCAG run | 1 | Starter + Pro |

### 4.4 How Credits Flow in the Product

**Before an AI action**
The action button shows the credit cost inline: "Build Prompt (1 credit)". If the user has insufficient credits, the button is disabled and shows "Top up" or "Upgrade". No API call is made.

**During an AI action**
Credits are deducted optimistically from the local balance immediately on confirmation. The API call runs in the background. The credit balance badge in Studio updates in real time.

**If the API fails**
The credit is refunded automatically. The user sees an error toast with a retry option. No credit is permanently lost due to a technical failure.

**At zero balance**
All AI feature buttons show a lock icon and "Top up" prompt. Core features — capture, raw prompt, CSS export, Figma sync, Studio canvas (no AI) — remain fully functional. The user is never blocked from the product, only from AI features.

**Monthly reset**
Credits reset on the 1st of each month at 00:00 UTC. Users see a "Credits refreshed" notification in the extension popup. The reset date is always visible in the Account tab.

### 4.5 Starter Credit Budget

| | |
|---|---|
| Working days per month | ~22 |
| AI actions per day (avg) | 3–4 |
| Monthly AI actions | ~70–80 |
| Credits available | 75 |
| Headroom | Tight fit for moderate users. Power users upgrade to Pro. |
| Cost per credit | $0.12 |

### 4.6 Pro Credit Budget

| | |
|---|---|
| Working days per month | ~22 |
| AI actions per day (avg) | 10–15 (mix of 1 and 2 credit) |
| Monthly AI actions | ~250–300 |
| Credits available | 300 |
| Headroom | Covers power users comfortably. Extreme edge cases approach the limit. |
| Cost per credit | $0.063 |

---

## 5. Unit Economics

### 5.1 Cost Model

Subsrf uses a BYOK (Bring Your Own Key) model for AI features. Users supply their own Claude API key, stored securely in `chrome.storage.sync`. Subsrf does not proxy or pay for Claude API calls. The credit system gates access to features — it does not cover API costs.

> ✅ **Key implication:** Subsrf's gross margin on AI features is effectively 100% minus Stripe fees (~3%). API costs are borne entirely by the user via their own Anthropic account. Credits are access tokens, not usage vouchers.

### 5.2 Revenue and Margin by Tier

| Tier | MRR per user | API cost (BYOK) | Gross margin | Notes |
|---|---|---|---|---|
| Free | $0 | $0 | 100% | Zero cloud cost. Zero risk. |
| Starter | $9 | $0 | ~97% | User pays Anthropic directly. |
| Pro | $19 | $0 | ~97% | User pays Anthropic directly. |

> ⚠️ **Note on infrastructure costs:** The MCP Bridge (Railway, api.subsrf.dev) is a real server cost. This is covered by Pro tier revenue. Free and Starter users do not connect to the cloud bridge for AI routing, so infrastructure cost scales with Pro users only.

---

## 6. Upgrade Paths & Triggers

### 6.1 Free → Starter

A Free user hits the Starter upgrade when they try to:

- Open Subsrf Studio (any capture mode that routes to the editor)
- Use Screenshot, Full Page, Accessibility Audit, or Image Drop capture
- Run AI Smart Prompt from Prompt Studio
- Sync more than 5 elements to Figma in a single session
- Exceed 10 elements in a capture session

Upgrade prompt is contextual — shown inline at the point of friction, not as a generic modal. For Figma sync, the first 5 elements push successfully and a banner appears: *"5 element limit reached. Upgrade to sync all elements."*

### 6.2 Starter → Pro

A Starter user hits the Pro upgrade when they try to:

- Access the MCP Bridge configuration in the Account tab
- See MCP Bridge or Figma Bridge status indicators in the Prompt Studio header
- Use Claude Desktop, Cursor, Zed, or Windsurf with Subsrf (npx config requires Pro)
- Use any Claude → Figma AI command (Create Frame, Set Text, etc.)
- Run Full Page Capture more than 5 times in a day

The strongest Starter → Pro trigger is Claude Desktop and Cursor users who discover they can't connect their AI client to their captured UI. The upgrade moment is precise and high-intent.

### 6.3 Credit Exhaustion

When a Starter or Pro user hits zero credits:

- All AI buttons in Studio show a lock icon and "Credits used up" label
- Core features remain active: capture, raw prompt, CSS export, Figma sync, Studio canvas (manual only)
- A banner in Studio shows: *"X credits used. Resets [date]. Upgrade for more."*
- For Pro users close to limit, an optional mid-month top-up will be offered in a future update

---

## 7. Appendix

### A. Glossary

| Term | Definition |
|---|---|
| Credit | Unit of access for AI features. 1 credit = 1 standard AI operation. |
| BYOK | Bring Your Own Key. User supplies their own Claude API key. Subsrf pays $0 in API costs. |
| MCP Bridge | Cloud server (api.subsrf.dev) connecting Chrome extension, Figma plugin, and Claude. |
| Figma Bridge | 2-second poll loop between cloud server and Figma plugin enabling real-time sync. |
| Subsrf Studio | The image annotation and AI analysis editor. Opens from capture modes. |
| Prompt Studio | The in-extension panel for generating raw UI briefs and CSS exports. |
| Smart Prompt Engine | Claude interpreting raw element data into semantically rich prompts. |
| Subsurface | The layer beneath the visual interface: computed styles, DOM, selectors, hierarchy. |

### B. Quick Tier Reference

| Tier | What you get |
|---|---|
| Free | DOM capture, raw prompt, CSS export, Figma sync (5 elements max). No AI, no MCP Bridge. |
| Starter $9/mo | Everything Free + Studio editor + AI analysis + all capture modes + unlimited Figma sync. 75 credits/mo. No MCP Bridge. |
| Pro $19/mo | Everything Starter + MCP Bridge + Claude ↔ Figma live control + Subsrf → Claude + Figma → Claude. 300 credits/mo. |

### C. MCP Config (Pro)

Add the following to your Claude Desktop, Cursor, Zed, or Windsurf MCP configuration:

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

---

*subsrf.dev · v1.0 · 2025 · Confidential*
