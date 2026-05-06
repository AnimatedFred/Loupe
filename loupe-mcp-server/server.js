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
import { request as httpsRequest } from "node:https";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

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

// --- Figma REST API Auth ---
const FIGMA_API_BASE = 'https://api.figma.com';
const FIGMA_AUTH_FILE = join(homedir(), '.claude', 'figma-auth.json');
let figmaAuthConfig = null;

function loadFigmaAuth() {
  try {
    if (existsSync(FIGMA_AUTH_FILE)) {
      return JSON.parse(readFileSync(FIGMA_AUTH_FILE, 'utf-8'));
    }
  } catch (_e) {}
  return null;
}

function getFigmaToken() {
  if (process.env.FIGMA_PAT) return process.env.FIGMA_PAT;
  if (!figmaAuthConfig) figmaAuthConfig = loadFigmaAuth();
  if (!figmaAuthConfig?.access_token) return null;
  if (figmaAuthConfig.expires_at && Date.now() > figmaAuthConfig.expires_at - 60_000) return null;
  return figmaAuthConfig.access_token;
}

function isFigmaRestAvailable() {
  return !!(getFigmaToken());
}

function httpsJson(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = { method, hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers: { ...headers } };
    if (body) {
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = httpsRequest(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (_e) {}
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function figmaApi(method, path, queryParams = {}) {
  const token = getFigmaToken();
  if (!token) throw new Error('Figma REST API not configured. Set FIGMA_PAT env var or authenticate via x-figma-bridge OAuth (stores token in ~/.claude/figma-auth.json).');
  const qs = new URLSearchParams(queryParams).toString();
  const url = `${FIGMA_API_BASE}${path}${qs ? '?' + qs : ''}`;
  const headers = {};
  if (token.startsWith('figd_')) {
    headers['X-Figma-Token'] = token;
  } else {
    headers['Authorization'] = `Bearer ${token}`;
  }
  let bodyStr = null;
  if (method !== 'GET' && queryParams && Object.keys(queryParams).length > 0) {
    bodyStr = JSON.stringify(queryParams);
  }
  const res = await httpsJson(method, url, headers, bodyStr);
  if (res.status === 429) throw new Error(`Figma API rate limited. Retry after ${res.headers['retry-after'] || '30'}s.`);
  if (res.status === 403) throw new Error('Figma API forbidden (403). Check token scopes or file permissions.');
  if (res.status === 404) throw new Error('Figma API not found (404). Check file_key or node_id.');
  if (res.status >= 400) throw new Error(`Figma API error ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data;
}

// --- Temp file helpers ---
const TEMP_DIR = join(tmpdir(), 'loupe-figma-exports');

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
}

function saveExportToFile(base64, nodeId, format) {
  ensureTempDir();
  const ext = { PNG: '.png', SVG: '.svg', PDF: '.pdf', JPG: '.jpg' }[format?.toUpperCase()] || '.png';
  const safeId = String(nodeId).replace(/[:/]/g, '-');
  const filePath = join(TEMP_DIR, `export-${safeId}-${Date.now()}${ext}`);
  writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return filePath;
}

// Load auth on startup
figmaAuthConfig = loadFigmaAuth();

// --- Supabase ---
// Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Railway environment variables.
// The service key (not anon key) lets the server verify JWTs and bypass RLS.
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Anon key is the public "publishable" key — safe to embed.
// Used as fallback when SUPABASE_SERVICE_KEY is not configured in Railway.
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6cnRib3ZzeG5sYWl2a29mdnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTc1MTksImV4cCI6MjA5MzU5MzUxOX0.pvke4PggpSZXIWR1CdJkL7Q-0008k8b03qNYA0L4HDk';

async function verifyToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  // Service-key path — preferred when SUPABASE_SERVICE_KEY is set in Railway
  if (supabase) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();
    return { user, tier: profile?.tier || 'free' };
  }

  // Anon-key fallback — uses the user's own token, same as the Chrome extension
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();
    if (!user.id) return null;
    const profRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=tier&id=eq.${user.id}`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );
    const tier = profRes.ok ? ((await profRes.json())[0]?.tier || 'free') : 'free';
    return { user, tier };
  } catch (_) {
    return null;
  }
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

// Query/response bridge (bidirectional: AI reads Figma state)
let pendingQuery = null;
let queryCounter = 0;
const queryResults = {}; // { [queryId]: { result, error } }

// --- HTTP Bridge (Extension Gateway) ---
const app = express();
// Figma plugin iframes have 'null' origin — explicitly allow it alongside all other origins
app.use(cors({
  origin: (origin, callback) => callback(null, origin === 'null' ? 'null' : (origin || '*')),
  credentials: false,
}));
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

// Bidirectional query: AI posts JS code, long-polls until the Figma plugin
// executes it and posts the result back via /api/figma/result.
app.post("/api/ai/query", async (req, res) => {
  queryCounter++;
  const queryId = queryCounter;
  pendingQuery = { id: queryId, code: req.body.code, timestamp: Date.now() };
  console.error(`[Loupe MCP] Query #${queryId} pending`);

  const deadline = Date.now() + 15000; // 15-second timeout
  while (Date.now() < deadline) {
    if (queryResults[queryId]) {
      const r = queryResults[queryId];
      delete queryResults[queryId];
      pendingQuery = null;
      console.error(`[Loupe MCP] Query #${queryId} resolved`);
      return res.json({ ok: true, queryId, result: r.result, error: r.error });
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  pendingQuery = null;
  res.status(408).json({ error: 'Query timed out — is the Figma plugin open and connected?' });
});

// Figma plugin posts query results here
app.post("/api/figma/result", (req, res) => {
  const { queryId, result, error } = req.body;
  if (queryId) {
    queryResults[queryId] = { result, error };
    console.error(`[Loupe MCP] Received result for query #${queryId}`);
  }
  res.json({ ok: true });
});

// Configure Figma PAT from extension
app.post("/api/config/figma", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Validate token by calling /v1/me
    const url = `${FIGMA_API_BASE}/v1/me`;
    const headers = {};
    if (token.startsWith('figd_')) {
      headers['X-Figma-Token'] = token;
    } else {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const figmaRes = await httpsJson('GET', url, headers);
    if (figmaRes.status !== 200) {
      let err = 'Invalid token';
      if (figmaRes.status === 403 && figmaRes.data?.err?.includes('scope')) {
        err = 'Missing scope: current_user:read';
      }
      return res.status(403).json({ error: err });
    }

    const userData = figmaRes.data;
    const config = {
      access_token: token,
      email: userData.email,
      handle: userData.handle,
      updated_at: Date.now()
    };

    const configDir = join(homedir(), '.claude');
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
    writeFileSync(FIGMA_AUTH_FILE, JSON.stringify(config, null, 2));
    figmaAuthConfig = config;

    console.error(`[Loupe MCP] Configured Figma PAT for ${userData.handle}`);
    res.json({ ok: true, handle: userData.handle, email: userData.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' });
  res.json({ email: auth.user.email, tier: auth.tier });
});

// Lightweight tier-only sync — called by the extension heartbeat so the
// Figma plugin always sees the correct tier even after a Railway restart.
app.post("/api/auth/sync", async (req, res) => {
  const auth = await verifyToken(req);
  if (auth?.tier) {
    lastTier = auth.tier;
    lastEmail = auth.user?.email || lastEmail;
  }
  res.json({ ok: true, tier: lastTier });
});

// ── Figma Plugin OAuth ────────────────────────────────────────────────────────
// Pending sessions keyed by state UUID — TTL 10 minutes
const figmaAuthSessions = new Map();

const BRIDGE_URL = process.env.BRIDGE_URL || 'https://web-production-9cce.up.railway.app';
const SUPABASE_URL_PUBLIC = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';

// Step 1 — plugin opens this URL to start OAuth
// redirect_to includes the state as a query param — add the wildcard entry
// https://web-production-9cce.up.railway.app/auth/figma/callback* to Supabase's
// allowed redirect URLs so the query string doesn't break the allowlist match.
app.get('/auth/figma/start', (req, res) => {
  const state = req.query.state || randomUUID().slice(0, 16);
  const callbackUrl = `${BRIDGE_URL}/auth/figma/callback?state=${state}`;
  const oauthUrl = `${SUPABASE_URL_PUBLIC}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(callbackUrl)}`;
  res.redirect(oauthUrl);
});

// Step 2 — Supabase redirects here with token in the URL fragment
app.get('/auth/figma/callback', (req, res) => {
  const state = (req.query.state || '').replace(/[^a-zA-Z0-9_-]/g, '');
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head><title>Loupe — Signing in...</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#f8fafc;flex-direction:column;gap:12px;margin:0}p{font-size:14px;color:#94a3b8}</style>
</head>
<body>
<div id="msg">Completing sign-in...</div>
<p id="sub"></p>
<script>
  var state = ${JSON.stringify(state)};
  var hash = location.hash.slice(1);
  var params = new URLSearchParams(hash);
  var accessToken = params.get('access_token');
  function setMsg(m, s) {
    document.getElementById('msg').textContent = m;
    document.getElementById('sub').textContent = s || '';
  }
  if (!accessToken) {
    setMsg('Sign-in failed', 'No token received from Google. Please try again.');
  } else if (!state) {
    setMsg('Sign-in failed', 'Session state missing — please retry from the Figma plugin.');
  } else {
    fetch('/auth/figma/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: state, accessToken: accessToken })
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error('Server error ' + r.status + ': ' + t); });
      return r.json();
    }).then(function(d) {
      if (d.ok) {
        setMsg('✓ Signed in!', 'You can close this tab and return to Figma.');
      } else {
        setMsg('Sign-in failed', d.error || 'Unknown error. Please try again.');
      }
    }).catch(function(err) {
      setMsg('Sign-in failed', err.message);
    });
  }
</script>
</body></html>`);
});

// Step 3 — callback page POSTs token here
// We store the token immediately and resolve tier lazily when the plugin polls
// /api/state (which does server-side verification with the Bearer token).
app.post('/auth/figma/store', async (req, res) => {
  const { state, accessToken } = req.body || {};
  if (!state || !accessToken) return res.status(400).json({ error: 'Missing state or token' });

  // Best-effort tier lookup — if Supabase isn't reachable, we still store the
  // session so sign-in succeeds; the tier will update on the first /api/state poll.
  let tier = 'free';
  let email = '';
  try {
    const auth = await verifyToken({ headers: { authorization: `Bearer ${accessToken}` } });
    if (auth) { tier = auth.tier; email = auth.user.email; }
  } catch (_) {}

  figmaAuthSessions.set(state, { accessToken, tier, email, expiresAt: Date.now() + 10 * 60 * 1000 });
  res.json({ ok: true });
});

// Step 4 — plugin polls this until the session appears
app.get('/api/auth/figma/session', (req, res) => {
  const state = (req.query.state || '').replace(/[^a-zA-Z0-9-]/g, '');
  const session = figmaAuthSessions.get(state);
  if (!session) return res.status(404).json({ error: 'Pending' });
  if (Date.now() > session.expiresAt) {
    figmaAuthSessions.delete(state);
    return res.status(410).json({ error: 'Expired' });
  }
  figmaAuthSessions.delete(state);
  // Also update global tier so all clients see it immediately
  lastTier = session.tier;
  lastEmail = session.email;
  res.json({ ok: true, accessToken: session.accessToken, tier: session.tier, email: session.email });
});

app.get("/api/state", async (req, res) => {
  // If the request comes from Figma, update heartbeat and optionally verify its own token
  if (req.query.source === 'figma') {
    lastFigmaHeartbeat = Date.now();
    // If the plugin sends its own Bearer token, derive tier directly — no extension needed
    if (req.headers.authorization) {
      const auth = await verifyToken(req);
      if (auth?.tier) {
        lastTier = auth.tier;
        lastEmail = auth.user?.email || lastEmail;
      }
    }
  }

  res.json({
    page: lastContext,
    count: lastElements.length,
    elements: lastElements,
    prompt: lastPrompt,
    screenshot: lastScreenshot,
    aiMessage: currentAiMessage,
    pendingQuery: pendingQuery,
    figmaConnected: lastFigmaHeartbeat > 0 && (Date.now() - lastFigmaHeartbeat) < 30000,
    restApiAvailable: isFigmaRestAvailable(),
    tier: lastTier,
    email: lastEmail
  });
});

const BRIDGE_PORT = process.env.PORT || 3333;

// Only start the local HTTP server when there is no relay endpoint.
// When --endpoint is set, all data comes from Railway — no local port needed.
if (!RELAY_ENDPOINT) {
  const serverInstance = app.listen(BRIDGE_PORT, "0.0.0.0", () => {
    console.error(`[Loupe MCP] Bridge active on port ${BRIDGE_PORT} (Local Mode)`);
  });
  serverInstance.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[Loupe MCP] FATAL ERROR: Port ${BRIDGE_PORT} is already in use.`);
      process.exit(1);
    }
  });
} else {
  console.error(`[Loupe MCP] Relay mode — no local HTTP server started`);
}

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
        description: "Retrieves the high-fidelity UI elements currently selected in the browser extension.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "query_figma",
        description: "Runs JavaScript in the Figma Plugin API sandbox and returns the result. Use this to READ from Figma: get selection, traverse the page tree, read styles, find nodes, inspect components, etc. The code runs inside the Figma plugin — return a value to get it back. Export tip: return { _base64Image: figma.base64Encode(bytes), format: 'PNG' } to auto-save to a temp file. Examples: 'return figma.currentPage.selection.map(n=>({id:n.id,name:n.name,type:n.type}))' or 'return figma.currentPage.children.map(n=>n.name)'",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "JavaScript to execute in the Figma plugin sandbox. Must return the data you want." }
          },
          required: ["code"]
        },
      },
      {
        name: "push_to_figma",
        description: "Sends commands to the Figma canvas. Use IMPORT_ELEMENTS to place captured web UI, EVAL to run any write operation via the Figma Plugin API, CREATE_FRAME to make a new frame, SET_TEXT to update text content, SET_FILL to change colors, MOVE to reposition a node, DELETE to remove nodes, or CLONE to duplicate.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["IMPORT_ELEMENTS", "EVAL", "CREATE_FRAME", "SET_TEXT", "SET_FILL", "MOVE", "DELETE", "CLONE", "SET_STYLE", "SWAP_COMPONENT"],
              description: "Operation type"
            },
            elements: { type: "array", items: { type: "object" }, description: "UI elements to import (IMPORT_ELEMENTS only)" },
            code: { type: "string", description: "Figma Plugin API JS to execute (EVAL only)" },
            nodeId: { type: "string", description: "Target node ID (most operations)" },
            name: { type: "string", description: "Name for new frame (CREATE_FRAME)" },
            x: { type: "number" }, y: { type: "number" },
            width: { type: "number" }, height: { type: "number" },
            text: { type: "string", description: "Text content (SET_TEXT)" },
            color: { type: "string", description: "CSS color string (SET_FILL)" },
            componentKey: { type: "string", description: "Component key to swap to (SWAP_COMPONENT)" },
            context: { type: "object", properties: { title: { type: "string" } } }
          },
          required: ["type"]
        },
      },
      {
        name: "figma_status",
        description: "Check the Figma bridge connection status and whether the Figma REST API is configured.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "figma_rest",
        description: "Call any Figma REST API endpoint directly. Common paths: /v1/me, /v1/files/KEY, /v1/files/KEY/nodes (with ids param), /v1/files/KEY/styles, /v1/files/KEY/variables/local, /v1/files/KEY/comments, /v1/teams/TEAM_ID/components. Requires FIGMA_PAT env var or token from ~/.claude/figma-auth.json.",
        inputSchema: {
          type: "object",
          properties: {
            method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"], description: "HTTP method (default: GET)" },
            path: { type: "string", description: "API path starting with /v1/ (e.g. \"/v1/me\", \"/v1/files/ABC123\")" },
            params: { type: "object", description: "Query params for GET requests, or JSON body for POST/PUT" }
          },
          required: ["path"]
        },
      },
      {
        name: "figma_search_components",
        description: "Search the Figma team library for published components and component sets by name. Returns component keys you can use with figma.importComponentByKeyAsync() in query_figma or push_to_figma EVAL. Requires FIGMA_PAT env var or token from ~/.claude/figma-auth.json.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Filter by name (case-insensitive substring match). Omit to list all." },
            team_id: { type: "string", description: "Figma team ID. Falls back to FIGMA_TEAM_ID env var or stored auth config." }
          }
        },
      },
      {
        name: "figma_export_rest",
        description: "Export Figma nodes as PNG, SVG, PDF, or JPG via the REST API (does not require the Figma plugin to be open). Downloads files to a local temp directory and returns file paths — use the Read tool to view them. Requires FIGMA_PAT env var or token from ~/.claude/figma-auth.json.",
        inputSchema: {
          type: "object",
          properties: {
            file_key: { type: "string", description: "Figma file key (from the file URL)" },
            node_ids: { type: "array", items: { type: "string" }, description: "Node IDs to export (e.g. [\"1:2\", \"3:4\"])" },
            format: { type: "string", enum: ["png", "svg", "pdf", "jpg"], description: "Export format (default: png)" },
            scale: { type: "number", description: "Export scale multiplier (default: 2, max: 4)" }
          },
          required: ["file_key", "node_ids"]
        },
      },
      {
        name: "configure_figma_auth",
        description: "Configures the Figma Personal Access Token (PAT) for the REST API. This will validate the token and save it to the local config file (~/.claude/figma-auth.json) for persistence.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "Your Figma Personal Access Token (PAT)" }
          },
          required: ["token"]
        },
      },
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

  if (name === "query_figma") {
    const endpoint = RELAY_ENDPOINT || `http://localhost:${BRIDGE_PORT}`;
    try {
      const res = await fetch(`${endpoint}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: args.code })
      });
      const data = await res.json();
      if (!res.ok) return { content: [{ type: "text", text: data.error || 'Query failed' }] };
      if (data.error) return { content: [{ type: "text", text: `Figma error: ${data.error}` }] };

      // Auto-save base64 image exports to temp files (mirrors x-figma-bridge convention)
      const result = data.result;
      if (result && typeof result === 'object' && result._base64Image) {
        const filePath = saveExportToFile(result._base64Image, 'eval-' + randomUUID().slice(0, 8), result.format || 'PNG');
        const { _base64Image, ...rest } = result;
        return { content: [{ type: "text", text: JSON.stringify({ ...rest, filePath, byteLength: Buffer.from(_base64Image, 'base64').length }, null, 2) }] };
      }

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed to reach Figma bridge: ${e.message}` }] };
    }
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

  if (name === "figma_status") {
    const endpoint = RELAY_ENDPOINT || `http://localhost:${BRIDGE_PORT}`;
    let bridgeStatus = null;
    try {
      const res = await fetch(`${endpoint}/api/state`);
      if (res.ok) {
        const data = await res.json();
        bridgeStatus = { figmaConnected: data.figmaConnected, elementCount: data.count || 0, tier: data.tier };
      }
    } catch (_e) {
      bridgeStatus = { error: 'Bridge unreachable' };
    }
    return { content: [{ type: "text", text: JSON.stringify({
      bridge: bridgeStatus,
      restApiAvailable: isFigmaRestAvailable(),
      restApiSource: process.env.FIGMA_PAT ? 'FIGMA_PAT env var' : (loadFigmaAuth() ? '~/.claude/figma-auth.json' : 'none'),
      relayEndpoint: RELAY_ENDPOINT || `local:${BRIDGE_PORT}`,
    }, null, 2) }] };
  }

  if (name === "figma_rest") {
    try {
      const method = (args.method || 'GET').toUpperCase();
      const path = args.path;
      if (!path || !path.startsWith('/v1/')) {
        return { content: [{ type: "text", text: 'Error: path must start with /v1/ (e.g. "/v1/me")' }] };
      }
      let result;
      if (method === 'GET') {
        result = await figmaApi('GET', path, args.params || {});
      } else {
        const token = getFigmaToken();
        if (!token) return { content: [{ type: "text", text: 'Error: Figma REST API not configured. Set FIGMA_PAT env var or authenticate via x-figma-bridge.' }] };
        const headers = { 'Content-Type': 'application/json' };
        if (token.startsWith('figd_')) {
          headers['X-Figma-Token'] = token;
        } else {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await httpsJson(method, `${FIGMA_API_BASE}${path}`, headers, bodyStr);
        if (res.status === 429) throw new Error(`Rate limited. Retry after ${res.headers['retry-after'] || '30'}s.`);
        if (res.status >= 400) throw new Error(`Figma API error ${res.status}: ${JSON.stringify(res.data)}`);
        result = res.data;
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }

  if (name === "figma_search_components") {
    try {
      figmaAuthConfig = figmaAuthConfig || loadFigmaAuth();
      const teamId = args.team_id || process.env.FIGMA_TEAM_ID || figmaAuthConfig?.team_id;
      if (!teamId) return { content: [{ type: "text", text: 'Error: No team_id provided. Pass team_id, set FIGMA_TEAM_ID env var, or authenticate via x-figma-bridge (auto-discovers team).' }] };
      const query = (args.query || '').toLowerCase();
      const [components, componentSets] = await Promise.all([
        figmaApi('GET', `/v1/teams/${teamId}/components`, { page_size: '100' }),
        figmaApi('GET', `/v1/teams/${teamId}/component_sets`, { page_size: '100' }),
      ]);
      const results = [];
      for (const item of (components.meta?.components || [])) {
        if (!query || item.name.toLowerCase().includes(query)) {
          results.push({ key: item.key, name: item.name, description: item.description || '', containing_frame: item.containing_frame?.name || null, file_key: item.file_key, node_id: item.node_id });
        }
      }
      for (const item of (componentSets.meta?.component_sets || [])) {
        if (!query || item.name.toLowerCase().includes(query)) {
          results.push({ key: item.key, name: item.name, description: item.description || '', containing_frame: item.containing_frame?.name || null, file_key: item.file_key, node_id: item.node_id, type: 'COMPONENT_SET' });
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ results, total: results.length }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }

  if (name === "figma_export_rest") {
    try {
      const fmt = args.format || 'png';
      const scale = Math.max(0.01, Math.min(4, args.scale ?? 2));
      const data = await figmaApi('GET', `/v1/images/${args.file_key}`, {
        ids: args.node_ids.join(','),
        format: fmt,
        scale: String(scale),
      });
      if (!data.images) throw new Error('No images returned from Figma API.');
      const results = {};
      for (const [nodeId, imageUrl] of Object.entries(data.images)) {
        if (!imageUrl) { results[nodeId] = { error: 'No URL returned for this node.' }; continue; }
        try {
          const imgRes = await new Promise((resolve, reject) => {
            const req = httpsRequest(imageUrl, (res) => {
              const chunks = [];
              res.on('data', (c) => chunks.push(c));
              res.on('end', () => resolve({ status: res.statusCode, data: Buffer.concat(chunks) }));
            });
            req.on('error', reject);
            req.end();
          });
          const filePath = saveExportToFile(imgRes.data.toString('base64'), nodeId, fmt.toUpperCase());
          results[nodeId] = { filePath, byteLength: imgRes.data.length };
        } catch (dlErr) {
          results[nodeId] = { error: dlErr.message };
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ exports: results, hint: 'Use the Read tool to view exported image files.' }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }

  if (name === "configure_figma_auth") {
    try {
      const token = args.token;
      if (!token) return { content: [{ type: "text", text: 'Error: Token is required.' }] };

      // Validate token by calling /v1/me
      const url = `${FIGMA_API_BASE}/v1/me`;
      const headers = {};
      if (token.startsWith('figd_')) {
        headers['X-Figma-Token'] = token;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await httpsJson('GET', url, headers);

      if (res.status !== 200) {
        return { content: [{ type: "text", text: `Error: Invalid token (Status ${res.status}). Please check your Figma PAT.` }] };
      }

      const userData = res.data;

      // Save to file
      const configDir = join(homedir(), '.claude');
      if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });

      const config = {
        access_token: token,
        email: userData.email,
        handle: userData.handle,
        updated_at: Date.now()
      };

      writeFileSync(FIGMA_AUTH_FILE, JSON.stringify(config, null, 2));
      figmaAuthConfig = config; // Update in-memory cache

      return {
        content: [{
          type: "text",
          text: `Successfully authenticated as ${userData.handle} (${userData.email}). Your Figma token has been saved to ${FIGMA_AUTH_FILE}.`
        }]
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error configuring auth: ${e.message}` }] };
    }
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Loupe MCP] MCP server running on stdio");
}

main().catch(console.error);
