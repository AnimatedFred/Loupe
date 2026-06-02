import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

console.log('✨ Generating Subsrf MCP Configuration...');

// Find absolute paths
const nodePath = process.execPath;
const nodeDir = path.dirname(nodePath);
let npxPath = path.join(nodeDir, process.platform === 'win32' ? 'npx.cmd' : 'npx');

// Fallback to "npx" if absolute path not found for some reason
if (!fs.existsSync(npxPath)) {
  npxPath = "npx";
}

// Check for --endpoint in process.argv
let endpoint = null;
const endpointIdx = process.argv.indexOf('--endpoint');
if (endpointIdx >= 0 && endpointIdx + 1 < process.argv.length) {
  endpoint = process.argv[endpointIdx + 1];
}

// Generate args array
const args = ["-y", "subsrf-intelligence"];
if (endpoint) {
  args.push("--endpoint", endpoint);
}

// Check for FIGMA_PAT
const figmaPat = process.env.FIGMA_PAT || '<YOUR_FIGMA_PAT>';

const jsonConfig = {
  "mcpServers": {
    "subsrf": {
      "command": npxPath,
      "args": args,
      "env": {
        "FIGMA_PAT": figmaPat
      }
    }
  }
};

// 1. Auto-configure Claude Desktop (if installed)
const claudeConfigDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
const claudeConfigPath = path.join(claudeConfigDir, 'claude_desktop_config.json');

try {
  let claudeConfig = { mcpServers: {} };
  
  if (fs.existsSync(claudeConfigPath)) {
    const existing = fs.readFileSync(claudeConfigPath, 'utf8');
    try {
      claudeConfig = JSON.parse(existing);
      if (!claudeConfig.mcpServers) claudeConfig.mcpServers = {};
    } catch (e) {
      console.warn('⚠️ Could not parse existing Claude Desktop config.');
    }
  } else if (!fs.existsSync(claudeConfigDir)) {
    fs.mkdirSync(claudeConfigDir, { recursive: true });
  }

  // Inject the absolute paths
  claudeConfig.mcpServers['subsrf'] = jsonConfig.mcpServers['subsrf'];

  fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
  console.log('✅ Successfully configured Claude Desktop!');
} catch (e) {
  // Silent fail for auto-config, they can manually copy-paste
}

// 2. Output for copy-pasting into Cursor, Windsurf, or others
console.log('\n--- Paste this into your IDE MCP Config ---');
console.log(JSON.stringify(jsonConfig, null, 2));
console.log('-------------------------------------------\n');
console.log('🎉 Setup complete! Restart your AI IDE for changes to take effect.');
