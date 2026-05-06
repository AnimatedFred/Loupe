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
 *
 * When spawned by Claude Desktop/Cursor via stdio, the --endpoint flag routes
 * get_selected_elements and push_to_figma through the Railway cloud bridge so
 * the local process and the Figma plugin share the same state.
 */

// Parse --endpoint <url> from CLI args (e.g. --endpoint https://web-production-9cce.up.railway.app)
const endpointArgIdx = process.argv.indexOf('--endpoint');
const RELAY_ENDPOINT = endpointArgIdx >= 0 ? process.argv[endpointArgIdx + 1] : null;
if (RELAY_ENDPOINT) {
  console.error(`[Loupe MCP] Relay endpoint: ${RELAY_ENDPOINT}`);
}

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

// New endpoint: Allow Figma to push selection back to the bridge
app.post("/api/figma/selection", async (req, res) => {
  const data = req.body;
  lastElements = data.elements || [];
  lastContext = data.context || lastContext;
  lastPrompt = "Figma Selection Analysis";
  console.error(`[Loupe MCP] Figma pushed ${lastElements.length} selected elements for analysis.`);
  res.json({ ok: true });
});

// Endpoint for the AI to push commands — no auth required since this is
// write-only (no user data exposed) and only executes in the Figma canvas.
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
    // When a relay endpoint is configured, fetch live state from the cloud bridge
    // so the AI sees whatever the Chrome extension last captured.
    let state = { page: lastContext, count: lastElements.length, elements: lastElements, prompt: lastPrompt };
    let screenshot = lastScreenshot;

    if (RELAY_ENDPOINT) {
      try {
        const res = await fetch(`${RELAY_ENDPOINT}/api/state`);
        const data = await res.json();
        state = { page: data.page, count: data.count || 0, elements: data.elements || [], prompt: data.prompt || "" };
        screenshot = data.screenshot || null;
      } catch (e) {
        console.error(`[Loupe MCP] Failed to fetch from relay: ${e.message}`);
      }
    }

    const content = [{ type: "text", text: JSON.stringify(state, null, 2) }];
    if (screenshot) {
      const base64Data = screenshot.split(',')[1];
      const mimeType = screenshot.split(',')[0].split(':')[1].split(';')[0];
      content.push({ type: "image", data: base64Data, mimeType });
    }
    return { content };
  }

  if (name === "push_to_figma") {
    // When a relay endpoint is configured, POST the command to the cloud bridge
    // so the Figma plugin (which polls Railway) receives it.
    if (RELAY_ENDPOINT) {
      try {
        const res = await fetch(`${RELAY_ENDPOINT}/api/ai/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        const data = await res.json();
        console.error(`[Loupe MCP] Relayed push_to_figma to cloud bridge (#${data.id})`);
        return {
          content: [{ type: "text", text: `Successfully pushed ${args.type} instruction to Figma plugin (#${data.id}).` }]
        };
      } catch (e) {
        console.error(`[Loupe MCP] Relay failed: ${e.message}`);
        return { content: [{ type: "text", text: `Failed to reach Figma bridge: ${e.message}` }] };
      }
    }

    // Local fallback (no relay configured)
    aiMessageCounter++;
    currentAiMessage = { id: aiMessageCounter, timestamp: Date.now(), ...args };
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
