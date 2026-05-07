var SUBSRF_CONFIG = {
  SERVER_URL: 'https://subsrf.up.railway.app',
  VERSION: '2.0.0',

  // ── Supabase ──────────────────────────────────────────────────────────────
  // Fill these in after creating your Supabase project:
  //   Settings → API → Project URL / anon public key
  SUPABASE_URL:      'https://yzrtbovsxnlaivkofvul.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6cnRib3ZzeG5sYWl2a29mdnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTc1MTksImV4cCI6MjA5MzU5MzUxOX0.pvke4PggpSZXIWR1CdJkL7Q-0008k8b03qNYA0L4HDk',

  // ── Tiers ─────────────────────────────────────────────────────────────────
  TIERS: {
    FREE: {
      name: 'Free',
      elementLimit: 5,
      canMcpSync: false,
      canFigmaSync: false,
      canExport: false
    },
    PRO: {
      name: 'Pro',
      elementLimit: 100,
      canMcpSync: true,
      canFigmaSync: true,
      canExport: true
    }
  },

  CURRENT_TIER: 'FREE',

  // ── MCP Bridge ────────────────────────────────────────────────────────────
  MCP_ENDPOINT: 'https://subsrf.up.railway.app/api/update',
  MCP_TOKEN: '',

  AUTO_CAPTURE: false,
  MCP_BRIDGE_ENABLED: true,

  // Refresh dynamic settings + auth state from storage
  async refresh() {
    const data = await chrome.storage.local.get(['mcp_endpoint', 'mcp_token', 'subsrf_session']);
    if (data.mcp_endpoint) this.MCP_ENDPOINT = data.mcp_endpoint;
    if (data.mcp_token)    this.MCP_TOKEN    = data.mcp_token;
    if (data.subsrf_session) {
      this.CURRENT_TIER = (data.subsrf_session.tier || 'free').toUpperCase();
    }
    return this;
  },

  // Returns the Authorization header value for MCP requests (empty string if signed out)
  async authHeader() {
    const { subsrf_session } = await chrome.storage.local.get('subsrf_session');
    if (!subsrf_session?.accessToken) return {};
    return { 'Authorization': `Bearer ${subsrf_session.accessToken}` };
  },

  ACTIONS: [
    { id: 'mcp_sync',  label: '🚀 MCP Sync', pro: true,  tool: 'sync_to_mcp' },
    { id: 'analyze',   label: '🔍 Analyze',   pro: false, tool: 'analyze_elements' },
  ]
};

if (typeof chrome !== 'undefined' && chrome.storage) {
  SUBSRF_CONFIG.refresh();
}

if (typeof module !== 'undefined') module.exports = SUBSRF_CONFIG;
