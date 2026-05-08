const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, ExternalHyperlink,
  TabStopType, TabStopPosition, PageBreak
} = require('docx');
const fs = require('fs');

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  void:     '050508',
  neon:     '00FF87',
  neonDim:  'D4FFE8',
  white:    'F2F2F4',
  t2:       '8A8A9A',
  t3:       '4A4A5A',
  layer:    '111118',
  surface:  '18181F',
  lift:     '202028',
  border:   'E8E8F0',
  green:    '00B86B',
  amber:    'E8960A',
  red:      'CC3333',
  black:    '000000',
};

// ── Borders ───────────────────────────────────────────────────────────────
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const accentBorder = { style: BorderStyle.SINGLE, size: 4, color: C.neon };

// ── Helpers ───────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before: before * 20, after: after * 20 } });
const indent = (left = 0, hanging = 0) => ({ indent: { left: left * 20, hanging: hanging * 20 } });

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: C.void })],
    spacing: { before: 480, after: 200 },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: C.void })],
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: C.void })],
    spacing: { before: 280, after: 120 },
  });
}

function h4(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Arial', size: 22, bold: true, color: C.void })],
    spacing: { before: 200, after: 80 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({
      text,
      font: 'Arial',
      size: 22,
      color: opts.muted ? C.t2 : C.void,
      bold: opts.bold || false,
      italics: opts.italic || false,
    })],
    spacing: { before: 60, after: 100 },
    ...opts.center ? { alignment: AlignmentType.CENTER } : {},
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: C.void })],
    spacing: { before: 40, after: 60 },
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: C.void })],
    spacing: { before: 40, after: 60 },
  });
}

function callout(label, text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [160, 9200],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 160, type: WidthType.DXA },
            borders: { ...noBorders, left: accentBorder },
            shading: { fill: C.neonDim, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 60 },
            children: [new Paragraph({
              children: [new TextRun({ text: '', font: 'Arial', size: 22 })]
            })],
          }),
          new TableCell({
            width: { size: 9200, type: WidthType.DXA },
            borders: { ...noBorders },
            shading: { fill: C.neonDim, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: label + ' ', font: 'Arial', size: 22, bold: true, color: '007A40' }),
                  new TextRun({ text, font: 'Arial', size: 22, color: '007A40' }),
                ]
              })
            ],
          }),
        ]
      })
    ],
    margins: { top: 100, bottom: 200 },
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
    spacing: { before: 200, after: 200 },
    children: [],
  });
}

function pageBreak() {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

function labelRow(label, value, labelWidth = 2880, valueWidth = 6480) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: labelWidth, type: WidthType.DXA },
        borders: allBorders,
        shading: { fill: 'F4F4F8', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: C.void })]
        })],
      }),
      new TableCell({
        width: { size: valueWidth, type: WidthType.DXA },
        borders: allBorders,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: value, font: 'Arial', size: 20, color: C.void })]
        })],
      }),
    ]
  });
}

function sectionMeta(pairs) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2880, 6480],
    rows: pairs.map(([l, v]) => labelRow(l, v)),
    margins: { bottom: 200 },
  });
}

// ── Pricing table helper ──────────────────────────────────────────────────
function pricingTable(tiers) {
  const colW = Math.floor(9360 / tiers.length);
  const colWidths = tiers.map(() => colW);

  const headerRow = new TableRow({
    children: tiers.map(tier => new TableCell({
      width: { size: colW, type: WidthType.DXA },
      borders: allBorders,
      shading: { fill: C.void, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: tier.name, font: 'Arial', size: 24, bold: true, color: 'FFFFFF' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: tier.price, font: 'Arial', size: 20, color: tier.highlight ? C.neon : 'AAAAAA' })]
        }),
      ],
    })),
  });

  const featureRows = tiers[0].features.map((_, rowIdx) =>
    new TableRow({
      children: tiers.map((tier, colIdx) => {
        const feat = tier.features[rowIdx];
        const isHeader = feat.startsWith('__');
        const text = isHeader ? feat.replace(/__/g, '') : feat;
        return new TableCell({
          width: { size: colW, type: WidthType.DXA },
          borders: allBorders,
          shading: { fill: isHeader ? 'F0F0F6' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: isHeader ? AlignmentType.LEFT : AlignmentType.LEFT,
            children: [new TextRun({
              text,
              font: 'Arial',
              size: isHeader ? 20 : 20,
              bold: isHeader,
              color: text === '—' ? C.t2 : C.void,
            })]
          })],
        });
      })
    })
  );

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...featureRows],
    margins: { bottom: 300 },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// DOCUMENT
// ─────────────────────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: '\u25E6',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: C.void } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: C.void },
        paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: C.void },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.void },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1300, bottom: 1440, left: 1300 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Subsrf — Product Feature Documentation', font: 'Arial', size: 18, color: C.t2 }),
              new TextRun({ text: '\t', font: 'Arial', size: 18 }),
              new TextRun({ text: 'CONFIDENTIAL', font: 'Arial', size: 18, color: C.t2, bold: true }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
            spacing: { after: 200 },
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'subsrf.dev  \u00B7  v1.0  \u00B7  2025', font: 'Arial', size: 18, color: C.t2 }),
              new TextRun({ text: '\t', font: 'Arial', size: 18 }),
              new TextRun({ text: 'Page ', font: 'Arial', size: 18, color: C.t2 }),
              new PageNumber(),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
            spacing: { before: 200 },
          })
        ]
      })
    },
    children: [

      // ══════════════════════════════════════════════════════════════
      // COVER PAGE
      // ══════════════════════════════════════════════════════════════

      new Paragraph({ children: [new TextRun({ text: '', size: 22 })], spacing: { before: 1200, after: 0 } }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'subsrf', font: 'Courier New', size: 72, bold: true, color: C.void })],
        spacing: { before: 0, after: 160 },
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Product Feature Documentation', font: 'Arial', size: 32, color: C.t2 })],
        spacing: { before: 0, after: 80 },
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Capture any UI. Send it everywhere.', font: 'Arial', size: 24, italics: true, color: C.t3 })],
        spacing: { before: 0, after: 800 },
      }),

      sectionMeta([
        ['Version', '1.0'],
        ['Status', 'Internal — Pre-launch'],
        ['Date', '2025'],
        ['Domain', 'subsrf.dev'],
        ['Classification', 'Confidential'],
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // 1. PRODUCT OVERVIEW
      // ══════════════════════════════════════════════════════════════

      h1('1. Product Overview'),

      body('Subsrf is a Chrome extension and developer tool that reads the subsurface layer of any webpage — the computed styles, DOM structure, XPath selectors, and element hierarchy that lives beneath the visual interface — and pipes that data to wherever it needs to go: AI clients via MCP, Figma workspaces, test suites, or bug trackers.'),

      body('Every interface has two layers. The surface is what users see. The subsurface is what developers and designers live in. Subsrf is the tool that bridges them.'),

      h3('Core Value Proposition'),

      bullet('Capture any UI element or region on any webpage in seconds'),
      bullet('Send structured element data to AI clients via the MCP protocol'),
      bullet('Push UI structure directly to Figma as editable frames and components'),
      bullet('Analyse design images (screenshots, Dribbble, mockups) with AI vision'),
      bullet('Generate precise, actionable AI prompts from live DOM data'),

      h3('Target Users'),

      bullet('Front-end developers inspecting and documenting UI'),
      bullet('Designers comparing live implementations to original mockups'),
      bullet('QA engineers generating automated test selectors'),
      bullet('AI-powered developers using Claude Desktop, Cursor, Zed, or Windsurf'),
      bullet('Agencies producing client handoff documentation'),

      h3('Platform'),

      sectionMeta([
        ['Extension', 'Chrome (Manifest V3) — Firefox planned Q3 2025'],
        ['MCP Server', 'Node.js — runs locally on user machine'],
        ['Bridge', 'localhost:7829 — no cloud dependency for core features'],
        ['AI Integration', 'MCP protocol — compatible with any MCP client'],
        ['Figma Integration', 'Figma Plugin + REST bridge'],
        ['Vision AI', 'Claude API (user-supplied key, BYOK model)'],
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // 2. FEATURE SET
      // ══════════════════════════════════════════════════════════════

      h1('2. Feature Set'),

      // ── 2.1 Capture Modes ──
      h2('2.1  Capture Modes'),

      body('Capture modes are the primary interaction model of Subsrf. The user activates a mode, interacts with the page, and Subsrf captures structured data about the selected UI. All capture modes feed into the same downstream pipeline: MCP bridge, Figma push, AI analysis, or prompt export.'),

      h3('2.1.1  Smart Click'),

      sectionMeta([
        ['Description', 'User clicks any element on the page to select it individually.'],
        ['Interaction', 'Hover to preview highlight. Click to select. Click again to deselect.'],
        ['Output', 'Full element descriptor: tag, semantic role, XPath, CSS selector, computed styles, dimensions, text content, children.'],
        ['Visual feedback', 'Neon green numbered badge appears top-left of each selected element. Page dims slightly.'],
        ['Multi-select', 'Any number of elements can be selected in sequence.'],
        ['Tier', 'All tiers — credit cost: 0 (capture only)'],
      ]),

      h3('2.1.2  Region'),

      sectionMeta([
        ['Description', 'User draws a rectangular box over any area of the page.'],
        ['Interaction', 'Click and drag to define region. Release to capture.'],
        ['Output — DOM mode', 'All elements fully contained within the region are captured, same descriptor format as Smart Click.'],
        ['Output — Vision mode', 'Region is screenshotted via captureVisibleTab, cropped to exact dimensions, sent to Claude vision API for analysis.'],
        ['Mode switch', 'After drawing the region, user is prompted: Capture Elements or Analyse with AI. If no DOM elements are found in the region (e.g. region drawn over an image), Vision mode is triggered automatically.'],
        ['Tier', 'DOM capture: all tiers. Vision analysis: costs 1 credit.'],
      ]),

      h3('2.1.3  Full Page'),

      sectionMeta([
        ['Description', 'Captures the entire page by auto-scrolling and stitching screenshots.'],
        ['Interaction', 'Single button press. Extension auto-scrolls, captures each viewport, stitches into one image.'],
        ['Output', 'Full-page PNG passed to vision analysis, or full DOM tree of visible elements.'],
        ['Use cases', 'Complete page audits, full design reviews, sending entire page context to AI.'],
        ['Tier', 'Starter and Pro only. Costs 2 credits per full-page vision analysis.'],
      ]),

      h3('2.1.4  Screenshot (Clean Shot)'),

      sectionMeta([
        ['Description', 'Captures a clean screenshot of the current viewport — no Subsrf overlays or highlights.'],
        ['Interaction', 'Single button. All Subsrf UI hides temporarily, screenshot taken, UI restores.'],
        ['Output', 'Clean PNG of visible viewport, available for download or passed to vision analysis.'],
        ['Use cases', 'Bug reports, design references, sharing current state with team.'],
        ['Tier', 'Starter and Pro only. Costs 1 credit if passed to vision analysis.'],
      ]),

      h3('2.1.5  Image Drop'),

      sectionMeta([
        ['Description', 'User drags and drops any image into the Subsrf sidebar — screenshots, Dribbble shots, Figma exports, mockups, sketches.'],
        ['Interaction', 'Drag image onto sidebar drop zone, or paste from clipboard (Cmd+V / Ctrl+V).'],
        ['Output', 'Image base64-encoded and sent to Claude vision API for structured UI analysis.'],
        ['Use cases', 'Analyse competitor UI, convert a Dribbble design into a build prompt, compare a mockup to live implementation.'],
        ['Tier', 'Starter and Pro only. Costs 1 credit per analysis.'],
      ]),

      divider(),

      // ── 2.2 MCP Bridge ──
      h2('2.2  MCP Bridge'),

      body('The Subsrf MCP server runs locally on the user machine (localhost:7829) and exposes a set of tools that any MCP-compatible AI client can call. The extension pushes captured element data to the bridge. The AI client reads it via MCP tools on demand.'),

      body('No data leaves the user machine unless they explicitly trigger a vision analysis via the Claude API. The MCP bridge is entirely local infrastructure.'),

      h3('MCP Tools Exposed'),

      sectionMeta([
        ['subsrf_get_elements', 'Returns all currently captured elements. Supports format=full, selectors_only, or prompt.'],
        ['subsrf_get_page_context', 'Returns metadata about the captured page: URL, title, timestamp.'],
        ['subsrf_get_element_by_index', 'Returns detailed data for a single element by its index number.'],
        ['subsrf_get_history', 'Returns list of recent capture sessions (up to 20).'],
        ['subsrf_compare_sessions', 'Diffs two past sessions — useful for before/after deploy comparison.'],
        ['subsrf_analyse_image', 'Triggers vision analysis on the most recent screenshot or dropped image. Pro only.'],
        ['subsrf_clear', 'Clears the current session.'],
      ]),

      h3('Compatible AI Clients'),

      bullet('Claude Desktop — via claude_desktop_config.json'),
      bullet('Cursor — via .cursor/mcp.json'),
      bullet('Zed — via ~/.config/zed/settings.json'),
      bullet('Windsurf — via ~/.codeium/windsurf/mcp_config.json'),
      bullet('Continue — via ~/.continue/config.json'),
      bullet('Any MCP-compatible client using stdio transport'),

      divider(),

      // ── 2.3 Figma Bridge ──
      h2('2.3  Figma Bridge'),

      body('The Subsrf Figma Plugin connects to the local MCP bridge and reads captured element data, then recreates those elements as native Figma nodes on the canvas. This allows developers to push live UI back into Figma for documentation, design QA, or handoff.'),

      h3('CSS to Figma Mapping'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 3120, 3900],
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 2340, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'CSS Property', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 3120, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Figma Property', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 3900, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Fidelity', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
            ]
          }),
          ...[ 
            ['width / height', 'node.resize(w, h)', '\u2713 Exact'],
            ['background-color', 'node.fills (SOLID)', '\u2713 Exact'],
            ['border-radius', 'node.cornerRadius', '\u2713 Exact'],
            ['color (text)', 'TextNode.fills', '\u2713 Exact'],
            ['font-size', 'node.fontSize', '\u2713 Exact'],
            ['font-weight', 'node.fontName.style', '\u2713 Exact'],
            ['border', 'node.strokes + strokeWeight', '\u2713 Exact'],
            ['opacity', 'node.opacity', '\u2713 Exact'],
            ['box-shadow', 'node.effects DROP_SHADOW', '\u2713 Exact'],
            ['display: flex', 'Auto Layout', '\u2248 Approximate'],
            ['gap', 'node.itemSpacing', '\u2248 Approximate'],
            ['padding', 'node.paddingTop/Right/Bottom/Left', '\u2248 Approximate'],
            ['linear-gradient', 'fills GRADIENT_LINEAR', '\u2248 Approximate'],
            ['display: grid', 'Auto Layout (best effort)', '\u2248 Lossy'],
            ['position: absolute', 'Absolute position in frame', '\u2248 Lossy'],
            ['z-index', 'Layer order', '\u2248 Lossy'],
            ['::before / ::after', 'Not captured (no DOM node)', '\u2717 Skipped'],
            ['CSS animations', 'Not applicable (Figma static)', '\u2717 Skipped'],
          ].map(([css, figma, fidelity]) => new TableRow({
            children: [
              new TableCell({ width: { size: 2340, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: css, font: 'Courier New', size: 18, color: C.void })] })] }),
              new TableCell({ width: { size: 3120, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: figma, font: 'Courier New', size: 18, color: C.void })] })] }),
              new TableCell({ width: { size: 3900, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: fidelity, font: 'Arial', size: 18, color: fidelity.startsWith('\u2713') ? '007A40' : fidelity.startsWith('\u2248') ? C.amber : C.red })] })] }),
            ]
          }))
        ],
        margins: { bottom: 300 },
      }),

      h3('What Subsrf Sends to Figma'),

      body('The extension captures computed values — not raw CSS. By the time Subsrf reads them via getComputedStyle(), the browser has resolved all variables, inheritance, and calculations to absolute pixel values. Colors are converted from CSS rgb() to Figma\'s 0\u20131 float format. Positions are converted from viewport-absolute to parent-relative.'),

      h3('Figma Features by Tier'),

      sectionMeta([
        ['All tiers', 'Basic frame recreation with dimensions, background, border radius, text layers.'],
        ['Starter + Pro', 'Auto Layout mapping from flex containers, shadow effects, stroke borders, gradient fills.'],
        ['Pro only', 'Full component tree with nested frames, redline annotation layer, Figma Variables mapping, sync/update existing frames.'],
      ]),

      divider(),

      // ── 2.4 AI Vision Analysis ──
      h2('2.4  AI Vision Analysis'),

      body('Vision analysis sends a screenshot or image to Claude\'s vision API and returns a structured breakdown of the UI. This works on any image source — live page regions, dropped Dribbble shots, Figma exports, competitor screenshots, hand-drawn wireframes.'),

      body('Vision is powered by the Claude API using the user\'s own API key (BYOK model). The key is stored securely in chrome.storage.sync and never transmitted to Subsrf servers.'),

      h3('Vision Analysis Modes'),

      h4('Describe UI'),
      body('Identifies all components, their hierarchy, estimated styles, and semantic purpose. Returns a structured breakdown suitable for documentation or as context for an AI coding task.'),

      h4('Generate Build Prompt'),
      body('Converts the visual UI into a precise, copy-pasteable prompt for AI coding tools: "Build this component with React and Tailwind. Here are the exact specs..." Includes estimated colors in hex, spacing in px, font sizes, and component relationships.'),

      h4('Match to My Code'),
      body('Accepts both a reference image (design) and a live page capture (implementation). Claude compares the two and returns a structured diff: what matches, what\'s off, and exactly how to fix it. Colors, spacing, font weights, component structure.'),

      h4('Push Structure to Figma'),
      body('Analyses a design image and generates a Figma-ready node payload — same format as the DOM capture pipeline. Allows any design image to be pushed into Figma as editable frames, without any Figma source file.'),

      h4('Accessibility Audit'),
      body('Analyses selected elements or a region for WCAG AA/AAA compliance issues. Returns severity levels, element references, and specific fix recommendations. Includes contrast ratio calculations from computed colors.'),

      callout('Note:', 'Vision analysis always uses the user\'s own Claude API key. Subsrf does not proxy or pay for vision calls — the cost goes directly to the user\'s Anthropic account. Credits purchased from Subsrf gate access to vision features but do not cover the API cost.'),

      divider(),

      // ── 2.5 Smart Prompt Engine ──
      h2('2.5  Smart Prompt Engine'),

      body('The Smart Prompt Engine is the AI reasoning layer that runs before the final prompt is assembled. Instead of dumping raw element data, Subsrf uses a lightweight Claude call to interpret the captured elements and produce a semantically rich, structured prompt.'),

      h3('What Changes'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: allBorders, shading: { fill: 'FFF0F0', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Before (Raw Dump)', font: 'Arial', size: 20, bold: true, color: C.red })] })] }),
              new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: allBorders, shading: { fill: 'F0FFF6', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'After (Smart Engine)', font: 'Arial', size: 20, bold: true, color: '007A40' })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'tag: button\ncss: .nav > button.cta\nwidth: 140px', font: 'Courier New', size: 18, color: C.void })] })] }),
              new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Primary CTA button in main navigation. Triggers conversion action. Positioned top-right per SaaS convention. Visually dominant via filled background.', font: 'Arial', size: 18, color: C.void })] })] }),
            ]
          }),
        ],
        margins: { bottom: 200 },
      }),

      h3('Smart Engine Capabilities'),

      bullet('Infers semantic intent from element context and relationships'),
      bullet('Groups related elements into logical components'),
      bullet('Detects common UI patterns (pricing tables, nav bars, forms, cards)'),
      bullet('Suggests what\'s missing (no aria-label, low contrast, missing alt text)'),
      bullet('Writes the prompt for a specific task — testing, Figma push, audit, documentation'),
      bullet('Costs 1 credit per smart prompt generation'),

      divider(),

      // ── 2.6 Export & Sharing ──
      h2('2.6  Export & Sharing'),

      h3('Export Formats'),

      sectionMeta([
        ['Markdown (.md)', 'Full element documentation in structured markdown. Copy or download.'],
        ['JSON (.json)', 'Raw element data in Figma-ready or MCP format. For pipeline integration.'],
        ['Selector List', 'XPath and CSS selectors only — for Playwright, Cypress, Selenium import.'],
        ['Annotated PNG', 'Screenshot of the page with numbered overlay boxes and element legend. Embeds Subsrf watermark on free tier.'],
        ['Shareable Link', 'Generates a URL containing the captured prompt and annotated screenshot. Pro: 50 links/month. Starter: 10 links/month.'],
      ]),

      h3('Annotated Screenshot'),

      body('When elements are selected, Subsrf can generate an annotated screenshot: numbered highlight boxes over each element, a legend panel bottom-left mapping each number to its element type and content, and a clean Subsrf watermark. This is the primary artefact for bug reports, design QA, and client handoffs.'),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // 3. CREDIT SYSTEM
      // ══════════════════════════════════════════════════════════════

      h1('3. Credit System'),

      h2('3.1  Why Credits'),

      body('Subsrf uses a credit-based system for AI-powered features because the underlying cost (Claude vision API calls) is variable and usage-dependent. Credits create a transparent, predictable cost model for users while protecting Subsrf from absorbing unpredictable API costs at scale.'),

      body('Credits are consumed only for features that trigger external AI API calls. All local features — DOM capture, MCP bridge, selector generation, raw prompt export — are always free and never consume credits.'),

      callout('Key principle:', 'Credits gate AI features. They do not gate the core product. A user who never uses AI vision still gets full value from Subsrf\'s capture and MCP bridge features at no cost.'),

      h2('3.2  What Costs a Credit'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [5200, 1880, 2280],
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 5200, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Feature', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 1880, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Credits', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 2280, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Available From', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
            ]
          }),
          ...[
            ['Smart Click capture (DOM only)', '0', 'All tiers'],
            ['Region capture (DOM only)', '0', 'All tiers'],
            ['Raw prompt export (no AI)', '0', 'All tiers'],
            ['MCP bridge — push to AI client', '0', 'All tiers'],
            ['Selector export (XPath / CSS)', '0', 'All tiers'],
            ['Smart Prompt Engine (AI interpretation)', '1', 'Starter + Pro'],
            ['Region Vision Analysis (screenshot + AI)', '1', 'Starter + Pro'],
            ['Image Drop Vision Analysis', '1', 'Starter + Pro'],
            ['Screenshot (Clean Shot) + AI analysis', '1', 'Starter + Pro'],
            ['Accessibility Audit (AI)', '1', 'Starter + Pro'],
            ['Full Page Vision Analysis', '2', 'Pro only'],
            ['Match to My Code (design diff)', '2', 'Starter + Pro'],
            ['Generate Build Prompt from image', '1', 'Starter + Pro'],
            ['Push image structure to Figma', '2', 'Pro only'],
            ['Annotated screenshot export (no watermark)', '0', 'Starter + Pro'],
            ['Shareable link generation', '0', 'Starter + Pro'],
          ].map(([feat, cred, tier]) => new TableRow({
            children: [
              new TableCell({ width: { size: 5200, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: feat, font: 'Arial', size: 20, color: C.void })] })] }),
              new TableCell({ width: { size: 1880, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cred, font: 'Arial', size: 20, bold: cred !== '0', color: cred === '0' ? C.t2 : cred === '2' ? C.amber : C.void })] })] }),
              new TableCell({ width: { size: 2280, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: tier, font: 'Arial', size: 20, color: tier === 'All tiers' ? '007A40' : tier === 'Pro only' ? C.amber : C.void })] })] }),
            ]
          }))
        ],
        margins: { bottom: 300 },
      }),

      h2('3.3  Credit Rules'),

      bullet('Credits reset on the 1st of each month. Unused credits do not roll over.'),
      bullet('Credits are per user account, not per device or installation.'),
      bullet('If a credit operation fails (API error, timeout), the credit is refunded automatically.'),
      bullet('Credit balance is always visible in the extension sidebar and account dashboard.'),
      bullet('Users receive an in-app warning when they have 10 credits or fewer remaining.'),
      bullet('No overage — when credits hit zero, AI features are disabled until the next reset or an upgrade.'),

      callout('Free tier protection:', 'The Free tier has zero credits. This is intentional. Free users get full access to DOM capture, MCP bridge, raw prompts, and selector export — the entire core product. They are never charged. AI vision features require a paid tier.'),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // 4. PRICING TIERS
      // ══════════════════════════════════════════════════════════════

      h1('4. Pricing Tiers'),

      h2('4.1  Tier Overview'),

      body('Subsrf has three tiers. Free is the full core product with no AI. Starter is for individual developers and designers who use AI features regularly. Pro is for power users and teams who push AI features hard and need higher limits.'),

      body('All tiers require the user to supply their own Claude API key (BYOK) for vision features. Credits gate access to AI features — they do not pay for the API calls themselves.'),

      pricingTable([
        {
          name: 'FREE',
          price: '$0 / month',
          highlight: false,
          features: [
            '__Core Features',
            'Smart Click capture',
            'Region capture (DOM)',
            'Full DOM inspection',
            'XPath + CSS selectors',
            'Raw prompt export',
            'MCP bridge (local)',
            'Figma push — basic frames',
            '__AI Features',
            '0 credits / month',
            'No vision analysis',
            'No Smart Prompt Engine',
            'No image drop',
            '__Limits',
            '10 elements per session',
            'No shareable links',
            'Watermark on exports',
            'Community support',
          ]
        },
        {
          name: 'STARTER',
          price: '$9 / month',
          highlight: false,
          features: [
            '__Core Features',
            'Smart Click capture',
            'Region capture (DOM + Vision)',
            'Full DOM inspection',
            'XPath + CSS selectors',
            'Raw prompt export',
            'MCP bridge (local)',
            'Figma push — full mapping',
            '__AI Features',
            '75 credits / month',
            'Vision analysis (1 credit)',
            'Smart Prompt Engine (1 credit)',
            'Image drop analysis (1 credit)',
            '__Limits',
            'Unlimited elements per session',
            '10 shareable links / month',
            'No watermark',
            'Email support',
          ]
        },
        {
          name: 'PRO',
          price: '$19 / month',
          highlight: true,
          features: [
            '__Core Features',
            'Smart Click capture',
            'Region capture (DOM + Vision)',
            'Full DOM inspection',
            'XPath + CSS selectors',
            'Raw prompt export',
            'MCP bridge (local)',
            'Figma push — full + Variables',
            '__AI Features',
            '300 credits / month',
            'Vision analysis (1 credit)',
            'Smart Prompt Engine (1 credit)',
            'Full page analysis (2 credits)',
            '__Limits',
            'Unlimited elements per session',
            '50 shareable links / month',
            'No watermark',
            'Priority support',
          ]
        },
      ]),

      h2('4.2  Tier Detail — Free'),

      body('Free is the complete core product. A developer can use Subsrf daily for DOM capture, MCP bridge, and raw prompt export without ever paying. The goal of Free is adoption — every developer who installs Subsrf and uses the MCP bridge is a potential Starter or Pro customer.'),

      h3('What Free Gets'),
      bullet('Smart Click and Region capture (DOM elements only)'),
      bullet('Full element data: XPath, CSS selectors, computed styles, dimensions, text'),
      bullet('Raw prompt export — copy structured prompt to clipboard'),
      bullet('MCP bridge — push captured data to Claude Desktop, Cursor, Zed, or any MCP client'),
      bullet('Basic Figma push — frames with dimensions, background, border radius, text'),
      bullet('10 elements per session maximum'),

      h3('What Free Does Not Get'),
      bullet('No AI vision analysis of any kind'),
      bullet('No Smart Prompt Engine (AI interpretation)'),
      bullet('No image drop'),
      bullet('No Full Page or Screenshot capture'),
      bullet('No shareable links'),
      bullet('Subsrf watermark on annotated screenshot exports'),

      h3('Why Free Does Not Lose Money'),
      body('Free users never trigger any API calls. There is no credit to consume, no vision call to make, no external service to pay. The only cost of a free user is server infrastructure for the MCP bridge — but since the bridge runs locally on their machine, there is no server cost either. Free is zero marginal cost to Subsrf.'),

      divider(),

      h2('4.3  Tier Detail — Starter ($9/month)'),

      body('Starter is for individual developers and designers who want AI features without committing to Pro. 75 credits per month comfortably covers a moderate usage pattern: 3\u20135 AI analyses per day on working days.'),

      h3('Credit Budget Example — Starter'),

      sectionMeta([
        ['Daily usage', '3\u20134 vision analyses per working day'],
        ['Monthly usage', '\u223C 75 analyses (1 credit each)'],
        ['Credits available', '75 / month'],
        ['Headroom', 'Exactly covers moderate daily use. Power users will upgrade.'],
        ['Cost per credit', '$0.12 per credit'],
      ]),

      h3('What Starter Gets (beyond Free)'),
      bullet('75 credits per month, resetting on the 1st'),
      bullet('Region Vision analysis \u2014 draw a box, get AI analysis of that area'),
      bullet('Image drop \u2014 drop any image for vision analysis'),
      bullet('Screenshot capture \u2014 clean shot of current viewport'),
      bullet('Smart Prompt Engine \u2014 AI interprets captured elements before prompt assembly'),
      bullet('Match to My Code \u2014 2 credits, compares design to implementation'),
      bullet('Full Figma push \u2014 Auto Layout, shadows, gradients, strokes'),
      bullet('Unlimited elements per session'),
      bullet('10 shareable links per month'),
      bullet('No watermark on exports'),

      divider(),

      h2('4.4  Tier Detail — Pro ($19/month)'),

      body('Pro is for power users, agencies, and developers who use AI features heavily. 300 credits per month supports intensive daily use and covers all 2-credit operations comfortably.'),

      h3('Credit Budget Example — Pro'),

      sectionMeta([
        ['Daily usage', '10\u201315 AI operations per working day'],
        ['Monthly usage', '\u223C 250\u2013300 operations (mix of 1 and 2 credit)'],
        ['Credits available', '300 / month'],
        ['Headroom', 'Covers power users. Someone who uses it all day, every day may approach the limit.'],
        ['Cost per credit', '$0.063 per credit'],
      ]),

      h3('What Pro Gets (beyond Starter)'),
      bullet('300 credits per month, resetting on the 1st'),
      bullet('Full Page Vision Analysis \u2014 auto-scroll entire page, 2 credits'),
      bullet('Push image structure to Figma \u2014 convert any design image to Figma nodes, 2 credits'),
      bullet('Figma Variables mapping \u2014 maps colors and spacing to existing Figma Variables'),
      bullet('Sync existing frames \u2014 update Figma frames from a new capture without redoing'),
      bullet('Redline annotation layer \u2014 spacing and padding marked up in Figma'),
      bullet('50 shareable links per month'),
      bullet('Priority email support'),

      divider(),

      h2('4.5  Unit Economics'),

      body('The following table shows the cost and margin for each tier at full credit usage. Vision API costs are estimated at $0.005 per credit (average of 1-credit operations at typical image sizes with Sonnet).'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 1560, 1560, 1560, 2340],
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 2340, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Tier', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 1560, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Revenue', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 1560, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Max API Cost', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 1560, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Gross Margin', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
              new TableCell({ width: { size: 2340, type: WidthType.DXA }, borders: allBorders, shading: { fill: C.void, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Notes', font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })] }),
            ]
          }),
          ...[
            ['Free', '$0', '$0', '100%', 'Zero API calls. Zero marginal cost.'],
            ['Starter', '$9', '$0.38', '96%', '75 credits \xD7 $0.005. BYOK covers actual API.'],
            ['Pro', '$19', '$1.50', '92%', '300 credits \xD7 $0.005. Strong margin at all usage levels.'],
          ].map(([tier, rev, cost, margin, notes]) => new TableRow({
            children: [
              new TableCell({ width: { size: 2340, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: tier, font: 'Arial', size: 20, bold: true, color: C.void })] })] }),
              new TableCell({ width: { size: 1560, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rev, font: 'Arial', size: 20, color: C.void })] })] }),
              new TableCell({ width: { size: 1560, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cost, font: 'Arial', size: 20, color: C.void })] })] }),
              new TableCell({ width: { size: 1560, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: margin, font: 'Arial', size: 20, bold: true, color: '007A40' })] })] }),
              new TableCell({ width: { size: 2340, type: WidthType.DXA }, borders: allBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: notes, font: 'Arial', size: 18, color: C.t2 })] })] }),
            ]
          }))
        ],
        margins: { bottom: 300 },
      }),

      callout('Important:', 'Because Subsrf uses BYOK, the API cost column above represents the cost of granting feature access (i.e. what Subsrf pays if it were to proxy calls) — not actual cost. In the BYOK model, Subsrf pays $0 in API costs. The margin on both Starter and Pro is effectively 100% minus payment processing fees (~3%).'),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // 5. CREDIT FLOW IN THE PRODUCT
      // ══════════════════════════════════════════════════════════════

      h1('5. Credit Flow in the Product'),

      h2('5.1  How Credits Appear to the User'),

      body('Credits are always visible. The sidebar header shows the current balance as a small badge next to the tier name. Before any AI action, the credit cost is shown on the button label. After the action, the deducted amount is confirmed in the activity feed.'),

      h3('Credit Display Locations'),
      bullet('Sidebar header badge \u2014 always visible, updates in real time'),
      bullet('Pre-action button label \u2014 "Analyse with AI (1 credit)"'),
      bullet('Post-action feed entry \u2014 "Vision analysis complete \u2014 1 credit used. 74 remaining."'),
      bullet('Account tab \u2014 full usage history, reset date, top-up option'),
      bullet('Warning toast at 10 credits remaining'),
      bullet('Hard block with upgrade prompt at 0 credits'),

      h2('5.2  Credit Check Flow'),

      body('Every AI action follows the same sequence before executing:'),

      numbered('User triggers an AI action (e.g. clicks "Analyse with AI")'),
      numbered('Extension checks local credit balance from chrome.storage.sync'),
      numbered('If balance < cost: show upgrade prompt. Stop.'),
      numbered('If balance >= cost: show confirmation with credit cost'),
      numbered('User confirms. Extension deducts credits optimistically (immediately).'),
      numbered('API call executes in background'),
      numbered('If API fails: refund credits, show error toast'),
      numbered('If API succeeds: result displayed, deduction confirmed on server'),
      numbered('Activity feed updated with action, cost, and remaining balance'),

      h2('5.3  Credit Reset'),

      body('Credits reset on the 1st of each calendar month at 00:00 UTC. Users receive a notification in the extension sidebar when their credits have reset. There is no partial reset, no pro-rata, and no rollover. The reset date is always shown in the Account tab.'),

      h2('5.4  Credit Edge Cases'),

      sectionMeta([
        ['Upgrade mid-month', 'New credit balance is applied immediately. The reset date becomes the upgrade date.'],
        ['Downgrade mid-month', 'User keeps current credits until end of period. Next reset applies new tier limit.'],
        ['API timeout (30s+)', 'Credit is refunded. User is informed. Retry is offered.'],
        ['Partial result', 'If Claude returns a partial response, credit is still consumed. A partial result is a result.'],
        ['Free tier attempt', 'AI action buttons are visible but disabled with "Starter required" label. No credit is touched.'],
        ['Zero balance', 'All AI features show a lock icon and "Top up" prompt. Core features are unaffected.'],
      ]),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // 6. TECHNICAL ARCHITECTURE
      // ══════════════════════════════════════════════════════════════

      h1('6. Technical Architecture'),

      h2('6.1  Component Map'),

      sectionMeta([
        ['Chrome Extension', 'Manifest V3. Content script (element capture, annotation). Sidebar (AI UI, credit display). Popup (mode select, status). Background service worker (badge, screenshot).'],
        ['MCP Server', 'Node.js. Runs locally on user machine. Exposes MCP tools via stdio. REST bridge on localhost:7829 for extension communication.'],
        ['Figma Plugin', 'Figma Plugin API. Connects to MCP bridge. Reads element payloads. Creates Figma nodes.'],
        ['Claude API (BYOK)', 'User\'s own key. Called directly from extension sidebar for vision. Never proxied through Subsrf servers.'],
        ['Subsrf Backend', 'Minimal. Handles: license key validation (Lemon Squeezy), credit balance, account management, shareable link storage.'],
        ['chrome.storage.sync', 'Stores: API key (encrypted), license key, credit balance, tier, session history.'],
      ]),

      h2('6.2  Data Flow'),

      h3('DOM Capture \u2192 MCP'),
      numbered('User selects elements via Smart Click or Region mode'),
      numbered('content.js reads computed styles, selectors, dimensions via getComputedStyle()'),
      numbered('Element descriptors built and stored in memory'),
      numbered('User clicks "Send to AI" in sidebar'),
      numbered('Extension POSTs payload to localhost:7829/loupe/capture'),
      numbered('MCP server stores session in memory'),
      numbered('User asks AI client to use subsrf_get_elements'),
      numbered('MCP server returns structured data to AI client'),

      h3('Vision Analysis'),
      numbered('User draws region or drops image'),
      numbered('Background service worker calls chrome.tabs.captureVisibleTab()'),
      numbered('Content script crops screenshot to region coordinates via canvas'),
      numbered('Image base64-encoded in extension'),
      numbered('Credit check performed locally'),
      numbered('Fetch call made directly to Claude API (api.anthropic.com) with user\'s key'),
      numbered('Response streamed back to sidebar'),
      numbered('Credit deducted, activity feed updated'),

      h2('6.3  Security'),

      bullet('API key stored in chrome.storage.sync \u2014 encrypted by Chrome, never transmitted to Subsrf'),
      bullet('All Claude API calls made directly from the extension to Anthropic \u2014 no Subsrf proxy'),
      bullet('MCP bridge is localhost-only \u2014 not accessible from external networks'),
      bullet('License keys validated server-side via Lemon Squeezy webhooks'),
      bullet('Credit balance stored server-side \u2014 not modifiable client-side'),
      bullet('No user browsing data is stored or transmitted by Subsrf'),

      pageBreak(),

      // ══════════════════════════════════════════════════════════════
      // 7. ROADMAP
      // ══════════════════════════════════════════════════════════════

      h1('7. Roadmap'),

      h2('v1.0 — Launch'),
      bullet('Smart Click and Region capture (DOM)'),
      bullet('MCP bridge with full tool set'),
      bullet('Basic Figma push (frames, text, background)'),
      bullet('Raw prompt export'),
      bullet('Annotated screenshot'),
      bullet('Free tier (no AI)'),
      bullet('Starter tier (75 credits)'),
      bullet('Pro tier (300 credits)'),

      h2('v1.1 — Vision'),
      bullet('Region vision analysis (1 credit)'),
      bullet('Image drop (1 credit)'),
      bullet('Smart Prompt Engine (1 credit)'),
      bullet('Screenshot capture'),
      bullet('BYOK Claude API key flow'),
      bullet('Credit balance display and warning system'),

      h2('v1.2 — Figma'),
      bullet('Full Figma push with Auto Layout'),
      bullet('Shadow, gradient, stroke mapping'),
      bullet('Push image structure to Figma (2 credits)'),
      bullet('Match to My Code \u2014 design diff (2 credits)'),

      h2('v1.3 — Pro Features'),
      bullet('Full Page vision analysis (2 credits)'),
      bullet('Figma Variables mapping'),
      bullet('Shareable links'),
      bullet('Session history and compare'),
      bullet('Firefox extension'),

      h2('v2.0 — Platform'),
      bullet('Web dashboard for account and usage'),
      bullet('Team accounts with separate per-seat credits'),
      bullet('VS Code extension'),
      bullet('Zapier / Make integration for shareable link webhooks'),
      bullet('Public API for enterprise customers'),

      divider(),

      // ══════════════════════════════════════════════════════════════
      // 8. APPENDIX
      // ══════════════════════════════════════════════════════════════

      h1('8. Appendix'),

      h2('A. Glossary'),

      sectionMeta([
        ['Credit', 'Unit of access for AI-powered features. 1 credit = 1 standard AI operation.'],
        ['BYOK', 'Bring Your Own Key. Users supply their own Claude API key. Subsrf does not proxy or pay for API calls.'],
        ['MCP', 'Model Context Protocol. Open standard for AI tool integration. Allows AI clients to call external tools.'],
        ['Bridge', 'The local MCP server (localhost:7829) that connects the extension to AI clients and Figma.'],
        ['Smart Prompt Engine', 'The AI layer that interprets raw element data and produces semantically rich prompts.'],
        ['Vision Analysis', 'Sending a screenshot or image to Claude\'s vision API for UI interpretation.'],
        ['Session', 'A single set of captured elements from one page visit.'],
        ['Selector', 'An XPath or CSS expression that uniquely identifies an element in the DOM.'],
        ['Subsurface', 'The layer beneath the visual interface \u2014 computed styles, DOM structure, selectors, hierarchy.'],
      ]),

      h2('B. Credit Cost Summary'),

      sectionMeta([
        ['0 credits', 'All DOM capture, MCP bridge, raw export, selector generation'],
        ['1 credit', 'Vision analysis, Smart Prompt Engine, image drop, accessibility audit, build prompt'],
        ['2 credits', 'Full page analysis, design diff, image-to-Figma push'],
      ]),

      h2('C. Contact'),

      sectionMeta([
        ['Product', 'subsrf.dev'],
        ['Support', 'support@subsrf.dev'],
        ['Documentation', 'docs.subsrf.dev'],
      ]),

      new Paragraph({ children: [new TextRun({ text: '', size: 22 })], spacing: { before: 400 } }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/claude/subsrf-feature-docs.docx', buffer);
  console.log('Done');
});
