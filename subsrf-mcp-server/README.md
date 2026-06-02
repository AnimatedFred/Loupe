# 🔍 Subsrf MCP Server

The AI backend for the Subsrf Chrome extension. Handles Claude API calls, tool execution, rate limiting, and license validation.

## Stack
- **Node.js** + Express
- **Claude API** via `@anthropic-ai/sdk`
- **MCP Tools** — analyze, test generation, accessibility audit, docs, improvements
- **Rate limiting** — free (10/hr) and pro (200/hr) tiers

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.example .env
# Edit .env and paste your Anthropic API key

# 3. Start the server
npm run dev
```

Server runs at `http://localhost:3000`

Test it:
```bash
curl http://localhost:3000/health
```

---

## Deploy to Railway

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variable: `ANTHROPIC_API_KEY=sk-ant-...`
5. Railway auto-detects Node.js and deploys

Your server URL will be something like:
`https://subsrf-mcp-server-production.up.railway.app`

Paste that URL into the extension's `config.js`.

---

## Deploy to Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Build command: `npm install`
5. Start command: `npm start`
6. Add env var: `ANTHROPIC_API_KEY`

---

## API Reference

### `POST /api/ask`
Main endpoint. Accepts a prompt + elements, returns Claude's response.

**Headers:**
- `Content-Type: application/json`
- `X-License-Key: pro_xxx` (optional, unlocks Pro tier)

**Body:**
```json
{
  "prompt": "..the full structured prompt from the extension..",
  "elements": [...],
  "action": "analyze | audit_accessibility | generate_tests | generate_documentation | suggest_improvements",
  "options": {}
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "result": "Markdown response from Claude",
  "toolUsed": "analyze_elements",
  "tier": "free | pro",
  "usage": { "inputTokens": 412, "outputTokens": 380 }
}
```

### `POST /api/ask/stream` *(Pro only)*
Same as above but streams response as SSE.

### `GET /health`
Returns server status.

---

## Adding Lemon Squeezy License Validation

1. Create a product at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Get your API key and store ID
3. Add to `.env`
4. Replace the `validateLicense()` stub in `server.js` with a real API call:

```js
async function validateLicense(key) {
  if (!key) return { valid: false, tier: 'free' };
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ license_key: key })
  });
  const data = await res.json();
  return data.valid
    ? { valid: true, tier: 'pro' }
    : { valid: false, tier: 'free' };
}
```

---

## MCP Tools Available

| Tool | Description | Tier |
|------|-------------|------|
| `analyze_elements` | General element analysis | Free + Pro |
| `audit_accessibility` | WCAG A/AA/AAA audit | Free + Pro |
| `suggest_improvements` | UX + code improvements | Free + Pro |
| `generate_tests` | Playwright/Cypress/Selenium tests | **Pro** |
| `generate_documentation` | Markdown/JSDoc/Storybook docs | **Pro** |

---

## Using with AI IDEs (Cursor, Windsurf, Claude Desktop)
## Using with AI IDEs (Cursor, Windsurf, Claude Desktop)

If your IDE gives you an **"executable file not found"** error for `npx`, it's because IDEs launched from macOS Launchpad/Spotlight don't inherit your terminal's `$PATH`.

### Easiest Fix: The Auto-Setup Script
Since users don't have this folder locally, tell them to run this one command in their terminal (which automatically passes their endpoint and Figma PAT):

```bash
FIGMA_PAT="your_pat_here" npx -y subsrf-intelligence setup --endpoint https://api.subsrf.dev
```

This script will automatically detect their exact, absolute path for `npx` (which solves the IDE bug) and give them the perfect, copy-pasteable JSON block for Cursor or Windsurf. If they use Claude Desktop, it will even configure it for them automatically!

### Alternative: Build a Standalone Binary
To completely bypass the Node.js/npx requirement for your users, you can compile this server into a standalone executable:

```bash
# Uses bun to compile the server into a single executable file
npm run build:exe
```

Users can then configure their IDE to point directly to the binary:
```json
{
  "command": "/absolute/path/to/subsrf-server",
  "args": []
}
```
