import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";

/**
 * Loupe MCP Server (HTTP Bridge Version)
 * More robust than WebSockets for browser extension service workers.
 */

// --- State ---
let lastElements = [];
let lastContext = null;
let lastPrompt = "";
let lastScreenshot = null;

// AI Bridge State
let currentAiMessage = null;
let aiMessageCounter = 0;
let lastFigmaHeartbeat = 0;

// --- HTTP Bridge (Extension Gateway) ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post("/api/update", (req, res) => {
  const data = req.body;
  if (data.type === "ELEMENTS_UPDATE") {
    lastElements = data.elements || [];
    lastContext = data.context || lastContext;
    lastPrompt = data.prompt || "";
    lastScreenshot = data.screenshot || null;
  }
  res.json({ ok: true });
});

// Endpoint for the AI to push commands
app.post("/api/ai/push", (req, res) => {
  aiMessageCounter++;
  currentAiMessage = {
    id: aiMessageCounter,
    timestamp: Date.now(),
    ...req.body
  };
  console.error(`[Loupe MCP] AI pushed message #${aiMessageCounter} (${currentAiMessage.type})`);
  res.json({ ok: true, id: aiMessageCounter });
});

app.get("/api/state", (req, res) => {
  // If the request comes from Figma (we can check a header or just assume any poll counts)
  if (req.query.source === 'figma') {
    lastFigmaHeartbeat = Date.now();
  }

  res.json({
    page: lastContext,
    count: lastElements.length,
    elements: lastElements,
    prompt: lastPrompt,
    screenshot: lastScreenshot,
    aiMessage: currentAiMessage,
    figmaConnected: lastFigmaHeartbeat > 0 && (Date.now() - lastFigmaHeartbeat) < 30000 // Connected if seen in last 30s
  });
});

const BRIDGE_PORT = process.env.PORT || 3333;
const serverInstance = app.listen(BRIDGE_PORT, "0.0.0.0", () => {
  console.error(`[Loupe MCP] Bridge active on port ${BRIDGE_PORT} (Cloud Mode)`);
});

serverInstance.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[Loupe MCP] FATAL ERROR: Port ${BRIDGE_PORT} is already in use.`);
    process.exit(1);
  }
});

// --- MCP Server ---
const server = new Server(
  {
    name: "loupe-mcp-server",
    version: "1.1.0",
  },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_selected_elements",
        description: "Retrieves the high-fidelity UI elements currently selected in the browser.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "push_to_figma",
        description: "Sends UI elements or layout instructions directly to the Figma canvas.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["IMPORT_ELEMENTS", "EVAL"], description: "Type of action" },
            elements: { type: "array", items: { type: "object" }, description: "List of UI elements to import" },
            code: { type: "string", description: "JavaScript code to execute in Figma sandbox (only for type EVAL)" },
            context: { type: "object", properties: { title: { type: "string" } } }
          },
          required: ["type"]
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "get_selected_elements") {
    const content = [
      {
        type: "text",
        text: JSON.stringify({
          page: lastContext,
          count: lastElements.length,
          elements: lastElements,
          prompt: lastPrompt
        }, null, 2),
      },
    ];

    if (lastScreenshot) {
      const base64Data = lastScreenshot.split(',')[1];
      const mimeType = lastScreenshot.split(',')[0].split(':')[1].split(';')[0];
      content.push({ type: "image", data: base64Data, mimeType: mimeType });
    }

    return { content };
  }

  if (name === "push_to_figma") {
    aiMessageCounter++;
    currentAiMessage = {
      id: aiMessageCounter,
      timestamp: Date.now(),
      ...args
    };
    console.error(`[Loupe MCP] AI (Tool) pushed message #${aiMessageCounter} (${currentAiMessage.type})`);
    return {
      content: [{ type: "text", text: `Successfully pushed ${args.type} instruction to Figma plugin (#${aiMessageCounter}).` }]
    };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Loupe MCP] MCP server running on stdio");
}

main().catch(console.error);
