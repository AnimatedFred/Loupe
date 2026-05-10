# Subsrf — Feature List

---

## Chrome Extension

### Capture

**Smart Click**
Select individual elements on any webpage by clicking them. Each selected element is highlighted with a numbered cyan outline so you always know exactly what you've captured.

**Region Tool**
Draw a rectangle over any part of the page to bulk-select every element inside the bounds. Useful for grabbing an entire section — nav, hero, card — in one gesture.

**Screenshot Capture**
Draw a region and capture a pixel-perfect screenshot of that area. The screenshot opens directly in Subsrf Studio for annotation and AI analysis.

**Full Page Capture**
Auto-scrolls the entire page, captures each section, and stitches the screenshots together into one full-length image. No manual scrolling needed.

**Accessibility Audit**
Select any elements on the page and trigger an accessibility audit. The extension captures a screenshot of the selection bounding box and opens it in Studio, automatically running a WCAG analysis.

**Image Drop Zone**
Drop any image (screenshot, Figma export, wireframe) directly into the popup. It routes straight to Studio for AI analysis — no capture step required.

---

### On-Page Toolbar

**Floating Toolbar**
A persistent toolbar anchored to the bottom of any page while Subsrf is active. Shows the current element count and all capture controls without blocking your work.

**Element Highlights**
Every selected element gets a numbered cyan highlight box overlaid directly on the page. Hover to reveal a remove button; click to deselect.

**Clear All**
Removes all selections and highlight boxes with one click, resetting the capture state.

**Show AI Prompt**
Opens Prompt Studio in a new tab with the current selection pre-loaded, ready to generate a prompt or export CSS.

---

### Prompt Studio

**Raw UI Brief (Prompt Mode)**
Generates a structured plain-text brief from your selected elements. Includes element type, selector, dimensions, full computed styles, text content, and a build-ready implementation prompt — ready to paste into any coding assistant.

**CSS Export Mode**
Extracts the computed CSS for every selected element and formats it as clean, copy-paste-ready CSS rules. Includes comments for dimensions, content, and semantic sections.

**AI Smart Prompt (Starter & Pro)**
Uses Claude to semantically interpret your captured elements. Returns a rich brief including extracted design tokens (colors, typography, spacing, radii, shadows), grouped components, accessibility gaps, and a detailed implementation prompt that references actual hex values and pixel measurements.

**MCP & Figma Status**
Live status indicators in the header showing whether the MCP Bridge is online and whether the Figma Plugin is connected — so you always know if the pipeline is active before you generate.

**Copy Output**
One-click copy of the full prompt or CSS to your clipboard.

---

### Subsrf Studio (Editor)

**Drawing Tools**
A full annotation toolkit: Rectangle, Circle, Star, Arrow, Text, Emoji, Pen (freehand), and a cursor stamp set. Each tool has configurable color, fill toggle, and stroke size (1–24px).

**Annotation Canvas**
Annotate directly on top of any screenshot. Drawings are composited onto the image on export. Supports zoom from 10% to 1000% with auto-fit on load.

**Layers Panel**
Every drawn object appears as a layer entry in the sidebar. Click a layer to select it; use the delete button to remove it. Bring to Front / Send to Back controls manage depth ordering.

**AI Analysis Panel (Starter & Pro)**
Three analysis modes available from the sidebar while viewing any captured image:

- **Build Prompt** — Generates a detailed, pixel-accurate implementation brief from the image, including design tokens and component descriptions.
- **Describe UI** — Returns a semantic breakdown of the UI: components, design system tokens, layout patterns, and purpose.
- **Accessibility Audit** — Scores the design against WCAG 2.1, lists specific issues by severity with fixes, and highlights what's already done well.

**Credit Balance**
The current credit balance is displayed in the Analysis panel so you always know your remaining budget before running an analysis.

**Copy & Download**
Export the annotated canvas as a PNG to clipboard or save it directly to your Downloads folder.

---

### Account & Billing

**Google Sign-In**
Authenticate with Google OAuth directly from the popup. Session persists across browser sessions.

**Tier Display**
Shows your current plan (Free / Starter / Pro), credit balance, and which features are active or locked.

**Upgrade CTA**
Free and Starter users see contextual upgrade prompts when accessing Pro-gated features, linking directly to the pricing page.

---

## Figma Plugin

### Authentication

**Google Sign-In**
Sign in with the same Google account as the extension. Session is stored securely in Figma's client storage and persists between sessions.

**Session Refresh**
Access tokens are automatically refreshed using the stored refresh token — no need to re-authenticate unless the session fully expires.

**Tier Badges**
The plugin UI shows your current plan (Free / Starter / Pro) so you always know your access level while working in Figma.

---

### Extension Sync

**Import from Extension**
Receive captured elements from the Chrome extension and recreate them as a structured Figma frame. Each element becomes its own layer with accurate geometry, positioning, and visual properties.

**Property Mapping**
The following computed CSS properties are translated into native Figma properties during import:
- Dimensions and position (width, height, x/y)
- Background colors and gradients
- Border radius
- Drop shadows
- Opacity
- Border (width, style, color)
- Flex layout (direction, gap, padding, alignment)
- Typography (family, weight, size, line-height, letter-spacing, alignment, color)
- Images (fetched and set as FILL fills)

**Gradient Support**
Linear gradients with any number of color stops are parsed from CSS `backgroundImage` and converted to native Figma gradients, including directional keywords and angle values.

**Smart Hierarchy**
Elements are sorted and nested by geometric containment — larger elements become parent frames, smaller elements inside them become children. This mirrors the original DOM structure without requiring any explicit nesting data.

---

### AI Command Routing

**AI-Driven Canvas Control**
When Claude (via the MCP Bridge) sends a Figma command, the plugin receives and executes it in real time. Supported operations include:

- **Create Frame** — Generate a new frame at specified coordinates
- **Set Text** — Write or update text content on any node
- **Set Fill** — Apply a solid color fill to any node
- **Move / Resize** — Reposition and resize nodes
- **Delete** — Remove a node from the canvas
- **Clone** — Duplicate a node with an offset
- **Swap Component** — Replace a component instance with a different component key
- **Query** — Execute arbitrary read queries and return results to Claude
- **Eval** — Run arbitrary write operations in the plugin sandbox

**Bidirectional Query**
Claude can ask the plugin to inspect any node and return its properties. Results are relayed back through the bridge, enabling Claude to make data-driven design decisions.

---

### Activity Feed

**Real-Time Log**
Every sync operation, AI command, and connection event is logged in the plugin with a timestamp. Color-coded entries (green for success, accent for AI events) give a clear audit trail of what happened and when.

---

## Infrastructure

### MCP Bridge

The MCP Bridge is a cloud server hosted on Railway (`api.subsrf.dev`) that acts as the central nervous system connecting the Chrome extension, the Figma plugin, and Claude.

Because Chrome extensions and Figma plugins are sandboxed environments that can't communicate directly, they both connect to the bridge server via HTTP polling. This creates a shared state that any participant can read from or write to.

**What it does:**

- Stores the latest captured elements and page context from the extension so Claude can access them via the `get_selected_elements` MCP tool
- Queues AI commands from Claude and delivers them to the Figma plugin on the next poll
- Relays Figma query results back to Claude so it can reason about the current canvas state
- Manages user authentication (JWT verification, token refresh, tier lookups)
- Tracks and deducts credits atomically for AI operations
- Handles Figma REST API requests on behalf of the plugin

**For Claude Desktop / Cursor users:**
The bridge is accessed via an MCP config that points to the hosted server. Once configured, Claude has access to your live captured UI data and can control Figma directly — without any local server required.

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

### Figma Bridge

The Figma Bridge is the real-time connection between the cloud server and the Figma plugin. It works through a 2-second polling loop: the plugin continuously asks the server "is there anything new for me?" and acts on whatever it finds.

**What it enables:**

- **Extension → Figma** — Elements captured in the browser arrive in Figma as a structured frame within seconds of clicking Sync
- **Claude → Figma** — When Claude sends a canvas command (create frame, set text, move a node), the bridge delivers it to the plugin and the result appears on the canvas in real time
- **Figma → Claude** — The plugin can push query results back through the bridge, letting Claude inspect the current design state before making changes

**Figma REST API** (separate from the plugin bridge) allows Claude to read file metadata, fetch node details, and make batch updates directly via the Figma API — useful for operations that don't require the plugin to be open.

**Connection status** is shown in both the Figma plugin activity feed and the Prompt Studio status bar, so you always know whether the pipeline is live before triggering a sync.
