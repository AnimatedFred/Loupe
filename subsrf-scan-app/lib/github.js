import jwt from 'jsonwebtoken';

// ── GitHub App credentials from env ──────────────────────────────────────────

const APP_ID = process.env.GITHUB_APP_ID;
const CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET;

function getPrivateKey() {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY || '';
  // Support base64-encoded PEM (safe for env vars / Railway / Vercel)
  if (raw.startsWith('LS0t')) return Buffer.from(raw, 'base64').toString('utf8');
  return raw;
}

// ── JWT for authenticating as the GitHub App itself ──────────────────────────

export function createAppJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,    // issued 60s ago (clock skew tolerance)
    exp: now + 600,   // 10 min max
    iss: APP_ID,
  };
  return jwt.sign(payload, getPrivateKey(), { algorithm: 'RS256' });
}

// ── Get an installation access token (scoped to repos the user installed) ───

export async function getInstallationToken(installationId) {
  const appJwt = createAppJWT();
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get installation token: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.token; // short-lived token (~1 hour)
}

// ── Exchange OAuth code for user access token ───────────────────────────────

export async function exchangeCodeForToken(code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error('GitHub OAuth token exchange failed');
  return res.json(); // { access_token, token_type, scope }
}

// ── GitHub API helper (with installation token) ─────────────────────────────

export async function githubApi(installationToken, path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `token ${installationToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

// ── List repos visible to an installation ───────────────────────────────────

export async function listInstallationRepos(installationToken) {
  const data = await githubApi(installationToken, '/installation/repositories?per_page=100');
  return (data.repositories || []).map(r => ({
    id: r.id,
    fullName: r.full_name,
    name: r.name,
    owner: r.owner.login,
    private: r.private,
    defaultBranch: r.default_branch,
    language: r.language,
    updatedAt: r.updated_at,
  }));
}

// ── Fetch the file tree (recursive) for a repo ──────────────────────────────

export async function getRepoTree(installationToken, owner, repo, branch = 'main') {
  try {
    const data = await githubApi(
      installationToken,
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );
    return (data.tree || []).filter(f => f.type === 'blob');
  } catch (err) {
    // Fallback: try 'master' branch
    if (branch === 'main') {
      return getRepoTree(installationToken, owner, repo, 'master');
    }
    throw err;
  }
}

// ── Fetch a single file's content ───────────────────────────────────────────

export async function getFileContent(installationToken, owner, repo, path) {
  const data = await githubApi(
    installationToken,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
  );
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf8');
  }
  return null;
}

// ── Build the GitHub App install URL ────────────────────────────────────────

export function getInstallUrl(state = '') {
  // This URL lets users install or configure the App on their repos
  const params = new URLSearchParams({ state });
  return `https://github.com/apps/subsrf/installations/new?${params}`;
}

export function getOAuthUrl(state = '') {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}
