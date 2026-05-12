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
import { randomUUID, createHmac } from "node:crypto";

/**
 * Subsrf MCP Server (HTTP Bridge Version)
 * More robust than WebSockets for browser extension service workers.
 *
 * When spawned by Claude Desktop/Cursor via stdio, the --endpoint flag routes
 * get_selected_elements and push_to_figma through the Railway cloud bridge so
 * the local process and the Figma plugin share the same state.
 */

// Parse --endpoint <url> from CLI args (e.g. --endpoint https://www.subsrf.dev)
const endpointArgIdx = process.argv.indexOf('--endpoint');
const RELAY_ENDPOINT = endpointArgIdx >= 0 ? process.argv[endpointArgIdx + 1] : null;
if (RELAY_ENDPOINT) {
  console.error(`[Subsrf MCP] Relay endpoint: ${RELAY_ENDPOINT}`);
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
const TEMP_DIR = join(tmpdir(), 'subsrf-figma-exports');

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

  const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';

  // Service-key path — preferred when SUPABASE_SERVICE_KEY is set in Railway
  if (supabase) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('tier, credits, credits_reset_at')
      .eq('id', user.id)
      .single();

    if (profError) console.error('[Subsrf Auth] Profile fetch error:', profError.message);

    const tier = profile?.tier || 'free';
    let credits = profile?.credits ?? 0;
    const tierCredits = { pro: 300, starter: 75 }[tier] ?? 0;

    // Monthly reset + first-time paid user initialization.
    // The DB DEFAULT sets credits_reset_at=now() (not start-of-month), so if getDate()!==1
    // and credits===0 for a paid tier the user was never initialized — grant their balance.
    const now = new Date();
    const lastReset = profile?.credits_reset_at ? new Date(profile.credits_reset_at) : null;
    const prevMonth = !lastReset ||
      lastReset.getFullYear() < now.getFullYear() ||
      (lastReset.getFullYear() === now.getFullYear() && lastReset.getMonth() < now.getMonth());
    const neverInitialized = tierCredits > 0 && credits === 0 &&
      (!lastReset || lastReset.getDate() !== 1);

    if (prevMonth || neverInitialized) {
      const { error: updateError } = await supabase.from('profiles').update({
        credits: tierCredits,
        credits_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      }).eq('id', user.id);
      if (updateError) {
        console.error('[Subsrf Credits] Init/reset update failed:', updateError.message);
      } else {
        console.error(`[Subsrf Credits] Init/reset for ${user.email}: ${credits} → ${tierCredits} (${neverInitialized ? 'first-time' : 'monthly'})`);
        credits = tierCredits;
      }
    }

    console.error(`[Subsrf Auth] service-key path: ${user.email} tier=${tier} credits=${credits}`);
    return { user, tier, credits };
  }

  // Anon-key fallback — used when SUPABASE_SERVICE_KEY is not set in Railway.
  // Uses the user's own JWT so RLS applies; the SECURITY DEFINER refund_credits RPC
  // handles initialization because regular users can't UPDATE their own credits via RLS.
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    if (!userRes.ok) {
      console.error('[Subsrf Auth] anon-key: user lookup failed', userRes.status);
      return null;
    }
    const user = await userRes.json();
    if (!user.id) return null;

    const profRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=tier,credits,credits_reset_at&id=eq.${user.id}`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );
    const profile = profRes.ok ? (await profRes.json())[0] : null;
    const tier = profile?.tier || 'free';
    let credits = profile?.credits ?? 0;
    const tierCredits = { pro: 300, starter: 75 }[tier] ?? 0;

    // Initialize first-time paid users or do monthly reset via the SECURITY DEFINER RPC.
    // refund_credits caps at tier max so calling it with the full balance is idempotent once initialized.
    const now = new Date();
    const lastReset = profile?.credits_reset_at ? new Date(profile.credits_reset_at) : null;
    const prevMonth = !lastReset ||
      lastReset.getFullYear() < now.getFullYear() ||
      (lastReset.getFullYear() === now.getFullYear() && lastReset.getMonth() < now.getMonth());
    const neverInitialized = tierCredits > 0 && credits === 0 &&
      (!lastReset || lastReset.getDate() !== 1);

    if (prevMonth || neverInitialized) {
      // Set credits via UPDATE (needs RLS UPDATE policy) then fall back to RPC if that fails
      const amount = tierCredits - credits; // top up to tier max
      if (amount > 0) {
        try {
          const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/refund_credits`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, amount })
          });
          if (rpcRes.ok) {
            const newBal = await rpcRes.json();
            console.error(`[Subsrf Credits] anon-key init/reset for ${user.email}: ${credits} → ${newBal}`);
            credits = typeof newBal === 'number' ? newBal : tierCredits;
          } else {
            console.error('[Subsrf Credits] anon-key refund_credits failed:', rpcRes.status, await rpcRes.text().catch(() => ''));
          }
        } catch (rpcErr) {
          console.error('[Subsrf Credits] anon-key RPC error:', rpcErr.message);
        }
      }
    }

    console.error(`[Subsrf Auth] anon-key path: ${user.email} tier=${tier} credits=${credits}`);
    return { user, tier, credits };
  } catch (e) {
    console.error('[Subsrf Auth] anon-key path error:', e.message);
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

// Stripe webhook — registered BEFORE express.json() so we receive the raw Buffer
// that Stripe requires for signature verification.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not set' });

  let event;
  try {
    const rawBody = req.body.toString('utf8');
    const parts = sig.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Parts = parts.filter(p => p.startsWith('v1='));
    if (!tPart || !v1Parts.length) throw new Error('Invalid stripe-signature header');
    const timestamp = tPart.slice(2);
    const expected = createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
    if (!v1Parts.some(v => v.slice(3) === expected)) throw new Error('Signature mismatch');
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) throw new Error('Timestamp too old');
    event = JSON.parse(rawBody);
  } catch (e) {
    console.error('[Subsrf Stripe] Webhook verification failed:', e.message);
    return res.status(400).json({ error: e.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.supabase_user_id;
    const tier = session.metadata?.tier || 'pro';
    const tierCredits = { pro: 300, starter: 75 }[tier] ?? 300;
    if (userId && supabase) {
      const now = new Date();
      const update = {
        tier,
        credits: tierCredits,
        credits_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      };
      if (session.customer) update.stripe_customer_id = session.customer;
      if (session.subscription) update.stripe_subscription_id = session.subscription;
      const { error } = await supabase.from('profiles').update(update).eq('id', userId);
      if (error) console.error('[Subsrf Stripe] Profile update failed:', error.message);
      else console.error(`[Subsrf Stripe] Upgraded ${userId} to ${tier} (credits=${tierCredits})`);
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    // Only act on active subscriptions — ignore past_due, canceled, etc.
    if (sub.status !== 'active') return res.json({ received: true });

    const newPriceId = sub.items?.data?.[0]?.price?.id;
    const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
    const starterPriceId = process.env.STRIPE_PRICE_ID_STARTER;
    const newTier = newPriceId === proPriceId ? 'pro' : newPriceId === starterPriceId ? 'starter' : null;
    if (newTier && sub.customer && supabase) {
      // Fetch current profile to make a smart credit decision instead of blindly resetting
      const { data: profile } = await supabase
        .from('profiles').select('tier, credits').eq('stripe_customer_id', sub.customer).single();

      const currentTier = profile?.tier || 'free';
      const currentCredits = profile?.credits ?? 0;
      const tierRank = { free: 0, starter: 1, pro: 2 };
      const newTierMax = { pro: 300, starter: 75 }[newTier];

      let newCredits;
      if (tierRank[newTier] > tierRank[currentTier]) {
        // Upgrade — grant the full new tier credit allocation
        newCredits = newTierMax;
      } else {
        // Downgrade (fires at period end via portal/schedule) — cap at new tier max
        // but don't add credits; the monthly reset at next period start handles the top-up
        newCredits = Math.min(currentCredits, newTierMax);
      }

      const { error } = await supabase.from('profiles')
        .update({ tier: newTier, credits: newCredits, stripe_subscription_id: sub.id })
        .eq('stripe_customer_id', sub.customer);
      if (error) console.error('[Subsrf Stripe] Plan update failed:', error.message);
      else console.error(`[Subsrf Stripe] ${currentTier} → ${newTier} for customer ${sub.customer} (credits: ${currentCredits} → ${newCredits})`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    if (sub.customer && supabase) {
      const { error } = await supabase.from('profiles')
        .update({ tier: 'free', credits: 0 })
        .eq('stripe_customer_id', sub.customer);
      if (error) console.error('[Subsrf Stripe] Downgrade failed:', error.message);
      else console.error(`[Subsrf Stripe] Downgraded customer ${sub.customer} to free`);
    }
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '50mb' }));

app.post("/api/update", async (req, res) => {
  const data = req.body;
  if (data.type === "ELEMENTS_UPDATE") {
    // Always store elements — tier gate is enforced on the READ side (/api/state).
    // Requiring auth here caused elements to silently disappear whenever the
    // extension's token was momentarily expired, breaking the Figma connection.
    lastElements   = data.elements || [];
    lastScreenshot = data.screenshot || null;
    lastContext    = data.context || lastContext;
    lastPrompt     = data.prompt  || "";

    // Best-effort tier update from the bearer token — keeps lastTier accurate
    // but never blocks storage or clears elements on auth failure.
    if (req.headers.authorization) {
      const auth = await verifyToken(req);
      if (auth) {
        lastTier  = auth.tier;
        lastEmail = auth.user.email || '';
      }
    } else if (!supabase) {
      lastTier = 'pro';
    }
  }
  res.json({ ok: true });
});

// New endpoint: Allow Figma to push selection back to the bridge
app.post("/api/figma/selection", async (req, res) => {
  const data = req.body;
  lastElements = data.elements || [];
  lastContext = data.context || lastContext;
  lastPrompt = "Figma Selection Analysis";
  console.error(`[Subsrf MCP] Figma pushed ${lastElements.length} selected elements for analysis.`);
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
  console.error(`[Subsrf MCP] AI pushed message #${aiMessageCounter} (${currentAiMessage.type})`);
  res.json({ ok: true, id: aiMessageCounter });
});

// Bidirectional query: AI posts JS code, long-polls until the Figma plugin
// executes it and posts the result back via /api/figma/result.
app.post("/api/ai/query", async (req, res) => {
  queryCounter++;
  const queryId = queryCounter;
  pendingQuery = { id: queryId, code: req.body.code, timestamp: Date.now() };
  console.error(`[Subsrf MCP] Query #${queryId} pending`);

  const deadline = Date.now() + 15000; // 15-second timeout
  while (Date.now() < deadline) {
    if (queryResults[queryId]) {
      const r = queryResults[queryId];
      delete queryResults[queryId];
      pendingQuery = null;
      console.error(`[Subsrf MCP] Query #${queryId} resolved`);
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
    console.error(`[Subsrf MCP] Received result for query #${queryId}`);
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

    console.error(`[Subsrf MCP] Configured Figma PAT for ${userData.handle}`);
    res.json({ ok: true, handle: userData.handle, email: userData.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' });
  res.json({ id: auth.user.id, email: auth.user.email, tier: auth.tier, credits: auth.credits });
});

// Admin endpoint — set a user's tier (and reset credits) without going to the Supabase SQL editor.
// Protected by ADMIN_SECRET env var. Usage:
//   POST /api/admin/set-tier
//   Header: x-admin-secret: <ADMIN_SECRET>
//   Body:   { "userId": "<supabase-user-id>", "tier": "pro" }
app.post('/api/admin/set-tier', async (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers['x-admin-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { userId, tier } = req.body || {};
  if (!userId || !['free', 'starter', 'pro'].includes(tier)) {
    return res.status(400).json({ error: 'userId and tier (free|starter|pro) required' });
  }
  const tierCredits = { pro: 300, starter: 75, free: 0 }[tier];
  const now = new Date();

  if (supabase) {
    const { error } = await supabase.from('profiles').update({
      tier,
      credits: tierCredits,
      credits_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }).eq('id', userId);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    // Without service key the PATCH will be blocked by RLS — admin endpoint requires it.
    return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY not configured on this server. Set it in Railway env vars.' });
  }

  console.error(`[Subsrf Admin] set-tier: userId=${userId} tier=${tier} credits=${tierCredits}`);
  res.json({ ok: true, userId, tier, credits: tierCredits });
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

// Returns the authenticated user's current credit balance.
// Uses the service key path (bypasses RLS) so the extension doesn't need
// column-level SELECT permissions on credits.
app.get('/api/credits/balance', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ balance: auth.credits, tier: auth.tier });
});

// Atomically deduct credits. The extension calls this before any AI operation.
// Railway verifies the JWT here, then calls the Supabase RPC with the service key.
// The RPC is SECURITY DEFINER — never exposed directly to extension clients.
app.post('/api/credits/deduct', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const cost = parseInt(req.body?.cost) || 1;
  if (auth.credits < cost) {
    return res.status(402).json({ error: 'insufficient_credits', balance: auth.credits });
  }

  try {
    let newBalance;
    if (supabase) {
      const { data, error } = await supabase.rpc('deduct_credits', { user_id: auth.user.id, amount: cost });
      if (error) throw new Error(error.message);
      newBalance = data;
    } else {
      const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
      const token = req.headers.authorization?.slice(7);
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/deduct_credits`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: auth.user.id, amount: cost })
      });
      if (!r.ok) throw new Error(`Deduct RPC failed: ${r.status}`);
      newBalance = await r.json();
    }
    console.error(`[Subsrf Credits] Deducted ${cost} credit(s) for ${auth.user.email} — balance: ${newBalance}`);
    res.json({ ok: true, balance: newBalance });
  } catch (e) {
    if (e.message === 'insufficient_credits') {
      return res.status(402).json({ error: 'insufficient_credits', balance: 0 });
    }
    console.error('[Subsrf Credits] Deduct failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Refund credits when an AI operation fails — caps at the tier monthly limit.
app.post('/api/credits/refund', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const cost = parseInt(req.body?.cost) || 1;

  try {
    let newBalance;
    if (supabase) {
      const { data, error } = await supabase.rpc('refund_credits', { user_id: auth.user.id, amount: cost });
      if (error) throw new Error(error.message);
      newBalance = data;
    } else {
      const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
      const token = req.headers.authorization?.slice(7);
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/refund_credits`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: auth.user.id, amount: cost })
      });
      if (!r.ok) throw new Error(`Refund RPC failed: ${r.status}`);
      newBalance = await r.json();
    }
    console.error(`[Subsrf Credits] Refunded ${cost} credit(s) for ${auth.user.email} — balance: ${newBalance}`);
    res.json({ ok: true, balance: newBalance });
  } catch (e) {
    console.error('[Subsrf Credits] Refund failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Creates a Stripe Checkout session and returns the redirect URL.
// Body: { tier: 'starter' | 'pro' }
// If the user already has an active subscription, returns a Customer Portal URL instead
// so plan changes go through the portal (which handles scheduling and proration correctly).
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const requestedTier = req.body?.tier;
  if (!['starter', 'pro'].includes(requestedTier)) {
    return res.status(400).json({ error: 'tier must be starter or pro' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured' });

  const appUrl = process.env.APP_URL || 'https://subsrf.dev';

  // If user already has an active paid subscription, redirect to portal for plan changes.
  // This prevents duplicate subscriptions and lets Stripe handle proration/scheduling.
  if (supabase) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, tier')
      .eq('id', auth.user.id).single();

    if (profile?.stripe_subscription_id && ['starter', 'pro'].includes(profile?.tier)) {
      try {
        const portalParams = new URLSearchParams({
          customer: profile.stripe_customer_id,
          return_url: `${appUrl}/?plan_change=done`,
        });
        const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: portalParams.toString(),
        });
        const portalData = await portalRes.json();
        if (portalRes.ok) {
          console.error(`[Subsrf Stripe] Redirecting ${auth.user.email} to portal for plan change`);
          return res.json({ url: portalData.url, via: 'portal' });
        }
      } catch (e) {
        console.error('[Subsrf Stripe] Portal redirect failed, falling through to checkout:', e.message);
      }
    }
  }

  const priceId = requestedTier === 'pro'
    ? process.env.STRIPE_PRICE_ID_PRO
    : process.env.STRIPE_PRICE_ID_STARTER;
  if (!priceId) {
    return res.status(500).json({ error: `STRIPE_PRICE_ID_${requestedTier.toUpperCase()} not set` });
  }

  try {
    const params = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'metadata[supabase_user_id]': auth.user.id,
      'metadata[tier]': requestedTier,
      customer_email: auth.user.email,
      success_url: `${appUrl}/?payment=success`,
      cancel_url: `${appUrl}/?payment=cancelled`,
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await stripeRes.json();
    if (!stripeRes.ok) throw new Error(data.error?.message || `Stripe error ${stripeRes.status}`);

    console.error(`[Subsrf Stripe] Checkout session for ${auth.user.email}`);
    res.json({ url: data.url });
  } catch (e) {
    console.error('[Subsrf Stripe] Create session failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Opens the Stripe Customer Portal so users can cancel, switch plans, or update billing.
// Requires the user to have completed a Stripe Checkout (stripe_customer_id must be set).
app.post('/api/stripe/create-portal-session', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured' });

  // Load stripe_customer_id from Supabase
  let customerId = null;
  if (supabase) {
    const { data } = await supabase.from('profiles').select('stripe_customer_id').eq('id', auth.user.id).single();
    customerId = data?.stripe_customer_id;
  }
  if (!customerId) {
    return res.status(400).json({ error: 'No Stripe customer found — complete a checkout first' });
  }

  const appUrl = process.env.APP_URL || 'https://subsrf.dev';
  try {
    const params = new URLSearchParams({ customer: customerId, return_url: appUrl });
    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await portalRes.json();
    if (!portalRes.ok) throw new Error(data.error?.message || `Stripe error ${portalRes.status}`);
    console.error(`[Subsrf Stripe] Portal session for ${auth.user.email}`);
    res.json({ url: data.url });
  } catch (e) {
    console.error('[Subsrf Stripe] Portal session failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Mid-cycle plan change with correct proration.
// Upgrade (Starter → Pro): charges only the prorated difference for the remaining days.
// Downgrade (Pro → Starter): redirects to Customer Portal, which schedules the
//   change at period end — the user keeps their paid tier until the cycle resets.
app.post('/api/stripe/change-plan', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const newTier = req.body?.tier;
  if (!['starter', 'pro'].includes(newTier)) {
    return res.status(400).json({ error: 'tier must be starter or pro' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = newTier === 'pro' ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID_STARTER;
  if (!stripeKey || !priceId) return res.status(500).json({ error: 'Stripe not configured' });

  if (!supabase) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY required' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, tier')
    .eq('id', auth.user.id).single();

  const currentTier = profile?.tier || 'free';
  const subscriptionId = profile?.stripe_subscription_id;

  if (!subscriptionId) {
    return res.status(400).json({ error: 'no_subscription', message: 'No active subscription. Use create-checkout-session to subscribe.' });
  }
  if (currentTier === newTier) {
    return res.json({ ok: true, message: 'Already on this plan' });
  }

  const tierRank = { free: 0, starter: 1, pro: 2 };
  const isUpgrade = tierRank[newTier] > tierRank[currentTier];
  const appUrl = process.env.APP_URL || 'https://subsrf.dev';

  try {
    if (isUpgrade) {
      // Fetch subscription to get the item ID for the update
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const sub = await subRes.json();
      if (!subRes.ok) throw new Error(sub.error?.message || `Stripe error ${subRes.status}`);

      const itemId = sub.items?.data?.[0]?.id;
      if (!itemId) throw new Error('No subscription item found');

      // Update immediately — Stripe creates a prorated invoice for the remaining days
      const params = new URLSearchParams({
        [`items[0][id]`]: itemId,
        [`items[0][price]`]: priceId,
        proration_behavior: 'create_prorated_invoice',
      });
      const updateRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const updated = await updateRes.json();
      if (!updateRes.ok) throw new Error(updated.error?.message || `Stripe error ${updateRes.status}`);

      // Apply immediately in Supabase — webhook will reconcile if it arrives later
      const newCredits = { pro: 300, starter: 75 }[newTier];
      await supabase.from('profiles')
        .update({ tier: newTier, credits: newCredits })
        .eq('id', auth.user.id);

      console.error(`[Subsrf Stripe] Upgraded ${auth.user.email}: ${currentTier} → ${newTier} (prorated, credits: ${newCredits})`);
      res.json({ ok: true, type: 'upgraded', tier: newTier });
    } else {
      // Downgrade — use the Customer Portal so Stripe schedules it for period end.
      // The user stays on their current paid tier; no charge or refund is issued now.
      const portalParams = new URLSearchParams({
        customer: profile.stripe_customer_id,
        return_url: `${appUrl}/?plan_change=scheduled`,
      });
      const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: portalParams.toString(),
      });
      const portalData = await portalRes.json();
      if (!portalRes.ok) throw new Error(portalData.error?.message || `Stripe error ${portalRes.status}`);

      console.error(`[Subsrf Stripe] Downgrade portal for ${auth.user.email}: ${currentTier} → ${newTier} (scheduled at period end)`);
      res.json({ ok: true, type: 'downgrade_portal', url: portalData.url, currentTier, scheduledTier: newTier });
    }
  } catch (e) {
    console.error('[Subsrf Stripe] change-plan failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Per-user Figma PAT — in-memory cache backed by Supabase profiles.figma_pat
const userFigmaPats = new Map(); // Map<userId, string>

async function getUserFigmaPat(userId, accessToken) {
  if (userFigmaPats.has(userId)) return userFigmaPats.get(userId);
  // Cache miss after Railway restart — load from Supabase
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
    let pat = null;
    if (supabase) {
      const { data } = await supabase.from('profiles').select('figma_pat').eq('id', userId).single();
      pat = data?.figma_pat || null;
    } else if (accessToken) {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=figma_pat&id=eq.${userId}`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (res.ok) pat = (await res.json())[0]?.figma_pat || null;
    }
    if (pat) userFigmaPats.set(userId, pat);
    return pat;
  } catch (_) { return null; }
}

app.post('/api/user/figma-pat', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const { pat } = req.body || {};
  if (!pat) return res.status(400).json({ error: 'Missing pat' });

  userFigmaPats.set(auth.user.id, pat);

  // Persist to Supabase so the value survives Railway restarts
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
    const accessToken = req.headers.authorization?.slice(7);
    if (supabase) {
      await supabase.from('profiles').update({ figma_pat: pat }).eq('id', auth.user.id);
    } else if (accessToken) {
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${auth.user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ figma_pat: pat })
      });
    }
  } catch (e) {
    console.error(`[Subsrf MCP] Failed to persist Figma PAT to Supabase: ${e.message}`);
  }

  console.error(`[Subsrf MCP] Stored Figma PAT for ${auth.user.email}`);
  res.json({ ok: true });
});

// ── Figma Plugin OAuth ────────────────────────────────────────────────────────
// Pending sessions keyed by state UUID — TTL 10 minutes
const figmaAuthSessions = new Map();

const BRIDGE_URL = process.env.BRIDGE_URL || 'https://api.subsrf.dev';
const SUPABASE_URL_PUBLIC = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';

// Step 1 — plugin opens this URL to start OAuth
// redirect_to includes the state as a query param — add the wildcard entry
// https://api.subsrf.dev/auth/figma/callback* to Supabase's
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
<head><title>Subsrf — Signing in...</title>
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
  var refreshToken = params.get('refresh_token') || '';
  var expiresIn = parseInt(params.get('expires_in') || '3600');
  if (!accessToken) {
    setMsg('Sign-in failed', 'No token received from Google. Please try again.');
  } else if (!state) {
    setMsg('Sign-in failed', 'Session state missing — please retry from the Figma plugin.');
  } else {
    fetch('/auth/figma/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: state, accessToken: accessToken, refreshToken: refreshToken, expiresIn: expiresIn })
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
  const { state, accessToken, refreshToken, expiresIn } = req.body || {};
  if (!state || !accessToken) return res.status(400).json({ error: 'Missing state or token' });

  // Best-effort tier lookup — if Supabase isn't reachable, we still store the
  // session so sign-in succeeds; the tier will update on the first /api/state poll.
  let tier = 'free';
  let email = '';
  try {
    const auth = await verifyToken({ headers: { authorization: `Bearer ${accessToken}` } });
    if (auth) { tier = auth.tier; email = auth.user.email; }
  } catch (_) {}

  const tokenExpiresAt = Date.now() + (expiresIn || 3600) * 1000;
  figmaAuthSessions.set(state, { accessToken, refreshToken, tokenExpiresAt, tier, email, expiresAt: Date.now() + 10 * 60 * 1000 });
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
  res.json({ ok: true, accessToken: session.accessToken, refreshToken: session.refreshToken || null, expiresAt: session.tokenExpiresAt || null, tier: session.tier, email: session.email });
});

// Figma plugin uses this to exchange an expired access token for a fresh one
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });

  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
    const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!refreshRes.ok) {
      const err = await refreshRes.text().catch(() => '');
      console.error(`[Subsrf] Token refresh failed ${refreshRes.status}: ${err}`);
      return res.status(401).json({ error: 'Token refresh failed' });
    }

    const data = await refreshRes.json();
    if (!data.access_token) return res.status(401).json({ error: 'No access token in refresh response' });

    // Look up tier with the new token
    let tier = 'free';
    let email = '';
    try {
      const auth = await verifyToken({ headers: { authorization: `Bearer ${data.access_token}` } });
      if (auth) { tier = auth.tier; email = auth.user.email; }
    } catch (_) {}

    res.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in || 3600,
      tier,
      email
    });
  } catch (e) {
    console.error(`[Subsrf] Refresh error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Smart Prompt Engine — interprets captured DOM elements using Claude and returns
// structured semantic JSON. The extension assembles the final prompt from that data.
// GEMINI_API_KEY must be set in Railway env.
app.post('/api/ai/generate', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const isPaid = auth.tier === 'starter' || auth.tier === 'pro';
  if (!isPaid) return res.status(403).json({ error: 'AI features require a paid plan' });
  if (auth.credits < 1) return res.status(402).json({ error: 'insufficient_credits', balance: auth.credits });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured on server' });

  // Deduct 1 credit before the AI call — refund on failure
  let newBalance;
  try {
    if (supabase) {
      const { data, error } = await supabase.rpc('deduct_credits', { user_id: auth.user.id, amount: 1 });
      if (error) throw new Error(error.message);
      newBalance = data;
    } else {
      const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
      const token = req.headers.authorization?.slice(7);
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/deduct_credits`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: auth.user.id, amount: 1 })
      });
      if (!r.ok) throw new Error(`Deduct RPC failed: ${r.status}`);
      newBalance = await r.json();
    }
  } catch (e) {
    if (e.message === 'insufficient_credits') return res.status(402).json({ error: 'insufficient_credits', balance: 0 });
    return res.status(500).json({ error: e.message });
  }

  const { elements = [], context: pageContext = {} } = req.body;

  // Interpretation prompt — Claude extracts design tokens from actual DOM styles and
  // returns structured JSON. The extension assembles the final prompt from this data.
  const systemPrompt = `You are a senior frontend engineer and design-systems expert. Given raw DOM element data captured from a live web page — including all computed CSS properties — analyze the design and return structured JSON. Return ONLY valid JSON, no markdown fences, no commentary, no text before or after.

Required format:
{
  "pagePattern": "concise page type (e.g. 'SaaS pricing page', 'e-commerce product listing', 'dashboard nav')",
  "designTokens": {
    "colors": [
      { "value": "#1a1a2e", "role": "primary-bg", "usage": "page/nav background" }
    ],
    "typography": [
      { "family": "Inter, sans-serif", "weight": "700", "size": "32px", "lineHeight": "1.2", "role": "heading-xl" }
    ],
    "spacing": ["4px", "8px", "16px", "24px", "48px"],
    "radii": ["4px", "8px", "9999px"],
    "shadows": ["0 4px 24px rgba(0,0,0,0.4)"]
  },
  "components": [
    {
      "name": "Component name",
      "elementIndices": [0, 1],
      "description": "What this component is and its role in the UI",
      "layout": "flex-row | flex-col | grid | block"
    }
  ],
  "elements": [
    {
      "index": 0,
      "label": "Human-readable element name",
      "semanticRole": "hero-headline | nav-cta | pricing-card | form-field | badge | card | tab | etc.",
      "description": "What it is and what it does in one sentence",
      "keyStyles": "The 3-5 most visually significant computed style values for this element, as a compact string e.g. 'Inter 700/32px · color #f8fafc · bg #6366f1 · radius 8px · shadow 0 4px 16px rgba(0,0,0,0.3)'",
      "accessibilityNote": "Specific issue if present (missing aria-label, low contrast, etc.) or empty string"
    }
  ],
  "accessibilityIssues": ["issue 1", "issue 2"],
  "implementationPrompt": "Detailed 4-6 sentence implementation prompt. MUST reference: the detected page pattern, exact hex color values from designTokens, font families and weights, key spacing/radius values, any notable visual treatments (shadows, gradients, glassmorphism, etc.). Never use generic descriptions like 'dark background' — always cite the actual value. Written to enable pixel-perfect reconstruction when pasted into a coding assistant."
}

Rules:
- Extract designTokens by reading ALL backgroundColor, color, fontFamily, fontSize, fontWeight, borderRadius, boxShadow, gap, padding values in the raw elements — deduplicate and assign semantic roles
- Every captured element must appear in the elements array
- Group related elements into meaningful components
- semanticRole is a single short kebab-case identifier
- keyStyles must quote actual computed values from the raw element data, not invent them
- implementationPrompt MUST cite specific hex codes, font names, and px values from the captured data`;

  const userContent = [
    `Page: ${pageContext.title || pageContext.url || 'Unknown'}`,
    `URL: ${pageContext.url || 'Unknown'}`,
    `Viewport: ${pageContext.viewport ? `${pageContext.viewport.w}×${pageContext.viewport.h}` : 'unknown'}`,
    '',
    `Captured ${elements.length} DOM elements with computed styles:`,
    JSON.stringify(elements, null, 2)
  ].join('\n');

  try {
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 25000);
    let aiRes;
    try {
      aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        signal: abortCtrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: { maxOutputTokens: 3500 }
        })
      });
    } finally {
      clearTimeout(abortTimer);
    }

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini error ${aiRes.status}`);
    }

    const result = await aiRes.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON — strip any accidental markdown fences the model might add
    let enriched;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      enriched = JSON.parse(cleaned);
    } catch (_) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI returned malformed JSON — please try again');
      enriched = JSON.parse(match[0]);
    }

    console.error(`[Subsrf AI] Smart prompt for ${auth.user.email} (${elements.length} elements) — balance: ${newBalance}`);
    res.json({ ok: true, enriched, balance: newBalance });

  } catch (e) {
    // Refund — generation failed, user should not be charged
    try {
      if (supabase) await supabase.rpc('refund_credits', { user_id: auth.user.id, amount: 1 });
    } catch (_) {}
    console.error(`[Subsrf AI] Smart prompt failed for ${auth.user.email}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Vision Analysis — sends a screenshot / dropped image to Claude and returns structured JSON.
// Five modes: describe, build_prompt, match, push_figma, accessibility.
const VISION_PROMPTS = {
  describe: `You are a UI design analyst with deep frontend expertise. Analyze the provided UI screenshot and return a structured JSON breakdown. Return ONLY valid JSON, no markdown fences, no commentary.
Required format:
{
  "pagePattern": "concise page type e.g. 'SaaS landing page'",
  "designSystem": {
    "colors": [{ "value": "#hex", "role": "role-name", "usage": "where used" }],
    "typography": [{ "family": "font name", "weight": "400|700|etc", "size": "estimated px", "role": "heading-xl|body|caption|etc" }],
    "spacing": ["8px", "16px", "..."],
    "radii": ["4px", "8px", "..."],
    "shadows": ["box-shadow value or omit if none"]
  },
  "components": [
    { "name": "...", "type": "section|card|nav|button|form|list|hero|footer|etc", "description": "what it does", "estimatedLayout": "flex-row|flex-col|grid|etc" }
  ],
  "semanticPurpose": "one sentence describing the page goal"
}`,

  build_prompt: `You are a senior frontend engineer. Analyze this UI screenshot and generate a precise implementation brief. Return ONLY valid JSON, no markdown fences.
Required format:
{
  "pagePattern": "concise page type",
  "designTokens": {
    "colors": [{ "value": "#hex", "role": "role-name", "usage": "where used" }],
    "typography": [{ "family": "font name", "weight": "number", "size": "px", "lineHeight": "ratio", "role": "heading-xl|body|etc" }],
    "spacing": ["px values"],
    "radii": ["px values"],
    "shadows": ["box-shadow values"]
  },
  "components": [
    { "name": "...", "description": "...", "keyStyles": "compact style summary with estimated values e.g. Inter 700/32px · color #fff · bg #6366f1 · radius 8px", "layout": "flex-row|flex-col|grid|etc" }
  ],
  "implementationPrompt": "Detailed 5-7 sentence implementation prompt. MUST cite: detected page pattern, estimated hex colors, font families and weights, estimated px values for type and spacing, border-radius and shadow details, component hierarchy. Written to enable pixel-perfect reconstruction by a React/Tailwind developer."
}`,

  match: `You are a frontend engineer doing design QA. The FIRST image is the reference design. The SECOND image is the current implementation. Compare them carefully. Return ONLY valid JSON, no markdown fences.
Required format:
{
  "matchScore": 0-100,
  "summary": "one sentence overall assessment",
  "matches": ["specific visual element that is correct"],
  "differences": [
    { "element": "UI element name", "reference": "what design shows", "implementation": "what was built instead", "severity": "critical|major|minor" }
  ],
  "fixes": [
    { "element": "...", "property": "CSS property", "currentValue": "...", "targetValue": "...", "fix": "exact change to make" }
  ]
}
Severity: critical = visually broken or wrong by >20%; major = noticeable; minor = subtle polish.`,

  push_figma: `You are a Figma expert. Analyze this UI screenshot and estimate a Figma frame structure with elements that match what you see. Return ONLY valid JSON, no markdown fences.
Required format:
{
  "pagePattern": "...",
  "frames": [
    {
      "name": "Frame name",
      "estimatedWidth": 1440,
      "estimatedHeight": 900,
      "backgroundColor": "#hex",
      "elements": [
        {
          "tagName": "div|h1|h2|h3|p|button|img|nav|a|span",
          "text": "visible text or empty string",
          "semanticRole": "hero-headline|nav-cta|body|label|card|etc",
          "rect": { "left": 0, "top": 0, "width": 200, "height": 48 },
          "styles": {
            "backgroundColor": "hex or rgba or transparent",
            "color": "#hex",
            "fontSize": "32px",
            "fontFamily": "Inter, sans-serif",
            "fontWeight": "700",
            "borderRadius": "8px",
            "boxShadow": "none"
          }
        }
      ]
    }
  ]
}
Assume viewport 1440px wide. Estimate all coordinates and sizes from visual proportions in the image.`,

  accessibility: `You are a WCAG 2.1 accessibility expert. Analyze this UI screenshot for accessibility issues. Return ONLY valid JSON, no markdown fences.
Required format:
{
  "overallScore": 0-100,
  "wcagLevel": "AAA|AA|A|Fails",
  "summary": "2-3 sentence assessment",
  "issues": [
    {
      "severity": "critical|major|minor",
      "element": "describe UI element visually",
      "issue": "specific accessibility problem",
      "wcagCriteria": "e.g. 1.4.3 Contrast (Minimum)",
      "estimatedValue": "e.g. contrast ratio ~2.8:1",
      "requiredValue": "e.g. contrast ratio 4.5:1",
      "fix": "specific actionable fix"
    }
  ],
  "positives": ["what IS done well for accessibility"]
}
Severity: critical = fails WCAG AA; major = fails AAA but passes AA; minor = best practice.`
};

app.post('/api/ai/vision', async (req, res) => {
  const auth = await verifyToken(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const isPaid = auth.tier === 'starter' || auth.tier === 'pro';
  if (!isPaid) return res.status(403).json({ error: 'AI features require a paid plan' });
  if (auth.credits < 1) return res.status(402).json({ error: 'insufficient_credits', balance: auth.credits });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured on server' });

  const { image, mimeType = 'image/png', mode = 'build_prompt', referenceImage, referenceMimeType = 'image/png' } = req.body;
  if (!image) return res.status(400).json({ error: 'image is required' });
  if (!VISION_PROMPTS[mode]) return res.status(400).json({ error: `Unknown mode: ${mode}` });

  // Deduct credits before the AI call — refund on failure
  let newBalance;
  try {
    if (supabase) {
      const { data, error } = await supabase.rpc('deduct_credits', { user_id: auth.user.id, amount: 1 });
      if (error) throw new Error(error.message);
      newBalance = data;
    } else {
      const supabaseUrl = process.env.SUPABASE_URL || 'https://yzrtbovsxnlaivkofvul.supabase.co';
      const token = req.headers.authorization?.slice(7);
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/deduct_credits`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: auth.user.id, amount: 1 })
      });
      if (!r.ok) throw new Error(`Deduct RPC failed: ${r.status}`);
      newBalance = await r.json();
    }
  } catch (e) {
    if (e.message === 'insufficient_credits') return res.status(402).json({ error: 'insufficient_credits', balance: 0 });
    return res.status(500).json({ error: e.message });
  }

  // Build parts — match mode sends two images
  const parts = [];
  if (mode === 'match' && referenceImage) {
    parts.push({ inline_data: { mime_type: referenceMimeType, data: referenceImage } });
    parts.push({ text: 'This is the REFERENCE design (first image).' });
    parts.push({ inline_data: { mime_type: mimeType, data: image } });
    parts.push({ text: 'This is the current IMPLEMENTATION (second image). Compare them.' });
  } else {
    parts.push({ inline_data: { mime_type: mimeType, data: image } });
    parts.push({ text: 'Analyze this UI screenshot.' });
  }

  try {
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 45000);
    let aiRes;
    try {
      aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        signal: abortCtrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: VISION_PROMPTS[mode] }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { maxOutputTokens: 4096 }
        })
      });
    } finally {
      clearTimeout(abortTimer);
    }

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini error ${aiRes.status}`);
    }

    const apiResult = await aiRes.json();
    const rawText = apiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (_) {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('AI returned malformed JSON — please try again');
      parsed = JSON.parse(m[0]);
    }

    console.error(`[Subsrf AI] Vision/${mode} for ${auth.user.email} — balance: ${newBalance}`);
    res.json({ ok: true, result: parsed, mode, balance: newBalance });

  } catch (e) {
    try { if (supabase) await supabase.rpc('refund_credits', { user_id: auth.user.id, amount: 1 }); } catch (_) {}
    console.error(`[Subsrf AI] Vision/${mode} failed for ${auth.user.email}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/state", async (req, res) => {
  let figmaRestAvailable = isFigmaRestAvailable();
  let userCredits = null;

  // If the request comes from Figma, update heartbeat and optionally verify its own token
  if (req.query.source === 'figma') {
    lastFigmaHeartbeat = Date.now();
    if (req.headers.authorization) {
      const auth = await verifyToken(req);
      if (auth?.tier) {
        lastTier = auth.tier;
        lastEmail = auth.user?.email || lastEmail;
      }
      if (auth?.user?.id) {
        const pat = await getUserFigmaPat(auth.user.id, req.headers.authorization.slice(7));
        if (pat) figmaRestAvailable = true;
      }
    }
  } else if (req.headers.authorization) {
    // Chrome extension polls /api/state with its Bearer token — return per-user PAT status + live credits
    const auth = await verifyToken(req);
    if (auth?.user?.id) {
      const pat = await getUserFigmaPat(auth.user.id, req.headers.authorization.slice(7));
      if (pat) figmaRestAvailable = true;
      userCredits = auth.credits ?? null;
    }
  }

  // Free: up to 5 elements. Starter/Pro: unlimited.
  const isPaidTier = lastTier === 'pro' || lastTier === 'starter';
  const elementsVisible = isPaidTier ? lastElements : lastElements.slice(0, 5);
  res.json({
    page: lastContext,
    count: elementsVisible.length,
    elements: elementsVisible,
    prompt: lastPrompt,
    screenshot: isPaidTier ? lastScreenshot : null,
    aiMessage: currentAiMessage,
    pendingQuery: pendingQuery,
    figmaConnected: lastFigmaHeartbeat > 0 && (Date.now() - lastFigmaHeartbeat) < 30000,
    restApiAvailable: figmaRestAvailable,
    tier: lastTier,
    email: lastEmail,
    credits: userCredits
  });
});

const BRIDGE_PORT = process.env.PORT || 3333;

// Only start the local HTTP server when there is no relay endpoint.
// When --endpoint is set, all data comes from Railway — no local port needed.
if (!RELAY_ENDPOINT) {
  const serverInstance = app.listen(BRIDGE_PORT, "0.0.0.0", () => {
    console.error(`[Subsrf MCP] Bridge active on port ${BRIDGE_PORT} (Local Mode)`);
  });
  serverInstance.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[Subsrf MCP] FATAL ERROR: Port ${BRIDGE_PORT} is already in use.`);
      process.exit(1);
    }
  });
} else {
  console.error(`[Subsrf MCP] Relay mode — no local HTTP server started`);
}

// --- MCP Server ---
const server = new Server(
  {
    name: "subsrf-mcp-server",
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
        console.error(`[Subsrf MCP] Failed to fetch from relay: ${e.message}`);
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
        console.error(`[Subsrf MCP] Relayed push_to_figma to cloud bridge (#${data.id})`);
        return {
          content: [{ type: "text", text: `Successfully pushed ${args.type} instruction to Figma plugin (#${data.id}).` }]
        };
      } catch (e) {
        console.error(`[Subsrf MCP] Relay failed: ${e.message}`);
        return { content: [{ type: "text", text: `Failed to reach Figma bridge: ${e.message}` }] };
      }
    }

    // Local fallback (no relay configured)
    aiMessageCounter++;
    currentAiMessage = { id: aiMessageCounter, timestamp: Date.now(), ...args };
    console.error(`[Subsrf MCP] AI (Tool) pushed message #${aiMessageCounter} (${currentAiMessage.type})`);
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
  console.error("[Subsrf MCP] MCP server running on stdio");
}

main().catch(console.error);
