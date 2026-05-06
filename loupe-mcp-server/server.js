#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

/**
 * Loupe MCP Server (HTTP Bridge Version)
 * More robust than WebSockets for browser extension service workers.
 */

// --- Supabase ---
// Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Railway environment variables.
// The service key (not anon key) lets the server verify JWTs and bypass RLS.
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

async function verifyToken(req) {
  if (!supabase) return null; // Auth not configured — open mode
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();
  return { user, tier: profile?.tier || 'free' };
}

function requirePro(handler) {
  return async (req, res) => {
    if (!supabase) return handler(req, res); // Auth not configured — allow all
    const auth = await verifyToken(req);
    if (!auth) return res.status(401).json({ error: 'Authentication required' });
    if (auth.tier !== 'pro') return res.status(403).json({ error: 'Pro plan required', tier: auth.tier });
    req.auth = auth;
    return handler(req, res);
  };
}

// --- State ---
let lastElements = [];
let lastContext = null;
let lastPrompt = "";
let lastScreenshot = null;
let lastTier = 'free';
let lastEmail = '';

// AI Bridge State
let currentAiMessage = null;
let aiMessageCounter = 0;
let lastFigmaHeartbeat = 0;

// --- HTTP Bridge (Extension Gateway) ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post("/api/update", async (req, res) => {
  const data = req.body;
  if (data.type === "ELEMENTS_UPDATE") {
    // Verify tier server-side — never trust the client-sent value
    let verifiedTier = 'free';
    if (!supabase) {
      // Auth not configured on this server instance — open mode
      verifiedTier = 'pro';
    } else {
      const auth = await verifyToken(req);
      verifiedTier = auth?.tier || 'free';
      lastEmail = auth?.user?.email || '';
    }
    lastTier = verifiedTier;

    // Only store elements and screenshots for Pro users
    if (verifiedTier === 'pro') {
      lastElements   = data.elements || [];
      lastScreenshot = data.screenshot || null;
    } else {
      lastElements   = [];
      lastScreenshot = null;
    }
    lastContext = data.context || lastContext;
    lastPrompt  = data.prompt  || "";
  }
  res.json({ ok: true });
});

// Endpoint for the AI to push commands (Pro only)
app.post("/api/ai/push", requirePro(async (req, res) => {
  aiMessageCounter++;
  currentAiMessage = {
    id: aiMessageCounter,
    timestamp: Date.now(),
    ...req.body
  };
  console.error(`[Loupe MCP] AI pushed message #${aiMessageCounter} (${currentAiMessage.type})`);
  res.json({ ok: true, id: aiMessageCounter });
}));

app.get("/api/auth/me", async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' });
  res.json({ email: auth.user.email, tier: auth.tier });
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
    figmaConnected: lastFigmaHeartbeat > 0 && (Date.now() - lastFigmaHeartbeat) < 30000,
    tier: lastTier,
    email: lastEmail
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
