var LOUPE_CONFIG = {
  SERVER_URL: 'http://localhost:3333',
  VERSION: '2.0.0',

  TIERS: {
    FREE: {
      name: 'Free',
      elementLimit: 5,
      canClone: false,
      canExport: false
    },
    PRO: {
      name: 'Pro',
      elementLimit: 100,
      canClone: true,
      canExport: true
    }
  },

  // For testing/development, we'll default to PRO
  // In production, this will be resolved via chrome.storage (Auth)
  CURRENT_TIER: 'PRO', 
  
  // --- MCP Bridge Settings ---
  MCP_ENDPOINT: 'http://localhost:3333/api/update',
  MCP_TOKEN: '',

  // --- Performance & Features ---
  AUTO_CAPTURE: false,
  MCP_BRIDGE_ENABLED: true,

  // Refresh dynamic settings from storage
  async refresh() {
    const data = await chrome.storage.local.get(['mcp_endpoint', 'mcp_token', 'test_tier']);
    if (data.mcp_endpoint) this.MCP_ENDPOINT = data.mcp_endpoint;
    if (data.mcp_token) this.MCP_TOKEN = data.mcp_token;
    if (data.test_tier) this.CURRENT_TIER = data.test_tier;
    return this;
  },

  ACTIONS: [
    { id: 'mcp_sync',               label: '🚀 MCP Sync',        pro: true,  tool: 'sync_to_mcp' },
    { id: 'analyze',                label: '🔍 Analyze',         pro: false, tool: 'analyze_elements' },
  ]
};

// Initial load
if (typeof chrome !== 'undefined' && chrome.storage) {
  LOUPE_CONFIG.refresh();
}

if (typeof module !== 'undefined') module.exports = LOUPE_CONFIG;
