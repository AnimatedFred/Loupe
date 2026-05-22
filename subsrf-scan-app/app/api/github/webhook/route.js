import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getServiceClient } from '../../../../lib/withAuth';
import { getInstallationToken, githubApi } from '../../../../lib/github';
import { shouldAuditFile, runAudit } from '../../../../lib/auditEngine';
import { applyTokenFixes } from '../../../../lib/patcher';

export const maxDuration = 60;

// Verify the GitHub webhook signature (HMAC-SHA256)
async function verifySignature(req, body) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev if not set

  const sig = req.headers.get('x-hub-signature-256');
  if (!sig) return false;

  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const expected = 'sha256=' + hmac.digest('hex');

  // Constant-time comparison
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(req) {
  const rawBody = await req.text();

  if (!(await verifySignature(req, rawBody))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = req.headers.get('x-github-event');
  if (event !== 'pull_request') {
    return NextResponse.json({ skipped: true, reason: 'not a pull_request event' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, pull_request: pr, installation, repository } = payload;

  // Only act on opened or synchronized (new commits pushed) PRs
  if (action !== 'opened' && action !== 'synchronize') {
    return NextResponse.json({ skipped: true, reason: `action=${action}` });
  }

  // Ignore PRs opened by this bot to prevent infinite loops
  const sender = payload.sender?.login || '';
  if (sender === 'subsrf[bot]' || sender.endsWith('[bot]')) {
    return NextResponse.json({ skipped: true, reason: 'bot PR' });
  }

  const installationId = installation?.id;
  const owner = repository?.owner?.login;
  const repo = repository?.name;
  const branch = pr?.head?.ref;
  const prNumber = pr?.number;

  if (!installationId || !owner || !repo || !branch) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Look up the Subsrf user who owns this installation
  const db = getServiceClient();
  const { data: inst } = await db
    .from('github_installations')
    .select('user_id')
    .eq('installation_id', installationId)
    .single();

  if (!inst) {
    // Installation not linked to any Subsrf user — ignore silently
    return NextResponse.json({ skipped: true, reason: 'installation not linked' });
  }

  // Find the most recently updated scan project for this user to use as token source.
  // In a future version, a per-repo mapping could specify which project to use.
  const { data: project } = await db
    .from('scan_projects')
    .select('slug, source_url, tokens, curated_tokens')
    .eq('user_id', inst.user_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ skipped: true, reason: 'no scan project found for user' });
  }

  try {
    const ghToken = await getInstallationToken(installationId);

    // Fetch files changed in this PR
    const files = await githubApi(
      ghToken,
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`
    );

    const auditableFiles = files.filter(f =>
      f.status !== 'removed' && shouldAuditFile(f.filename)
    );

    if (auditableFiles.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'no auditable files in PR' });
    }

    // Fetch file contents from the PR branch
    const fileContents = (await Promise.all(
      auditableFiles.map(async f => {
        try {
          const data = await githubApi(
            ghToken,
            `/repos/${owner}/${repo}/contents/${encodeURIComponent(f.filename)}?ref=${branch}`
          );
          if (data.encoding === 'base64' && data.content) {
            return {
              path: f.filename,
              content: Buffer.from(data.content, 'base64').toString('utf8'),
              sha: data.sha,
            };
          }
          return null;
        } catch {
          return null;
        }
      })
    )).filter(Boolean);

    if (fileContents.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'could not fetch file contents' });
    }

    // Run the audit against the project tokens
    const tokens = project.curated_tokens
      ? { ...project.tokens, [project.tokens.hasDark ? 'dark' : 'light']: project.curated_tokens }
      : project.tokens;

    const audit = runAudit(fileContents, tokens);

    if (audit.totalViolations === 0) {
      await postPrComment(ghToken, owner, repo, prNumber, {
        type: 'clean',
        filesScanned: audit.filesScanned,
        source: project.source_url,
      });
      return NextResponse.json({ ok: true, patched: 0, violations: 0 });
    }

    // Apply deterministic token fixes
    const patches = applyTokenFixes(fileContents, audit.violations, tokens);

    if (patches.length === 0) {
      // Violations found but none auto-fixable — leave a review comment
      await postPrComment(ghToken, owner, repo, prNumber, {
        type: 'review',
        violations: audit.violations.slice(0, 20),
        source: project.source_url,
      });
      return NextResponse.json({ ok: true, patched: 0, violations: audit.totalViolations });
    }

    // Push fixed files back to the PR branch
    let pushed = 0;
    for (const patch of patches) {
      try {
        const encoded = Buffer.from(patch.content).toString('base64');
        await githubApi(
          ghToken,
          `/repos/${owner}/${repo}/contents/${encodeURIComponent(patch.path)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `subsrf: replace hardcoded tokens in ${patch.path}`,
              content: encoded,
              sha: patch.sha,
              branch,
            }),
          }
        );
        pushed++;
      } catch (err) {
        console.error(`[webhook] Failed to push ${patch.path}:`, err.message);
      }
    }

    await postPrComment(ghToken, owner, repo, prNumber, {
      type: 'patched',
      patched: pushed,
      remaining: audit.totalViolations - patches.reduce((s, p) => s + p.fixCount, 0),
      source: project.source_url,
    });

    return NextResponse.json({ ok: true, patched: pushed, violations: audit.totalViolations });
  } catch (err) {
    console.error('[webhook] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function postPrComment(ghToken, owner, repo, prNumber, { type, violations, patched, remaining, filesScanned, source }) {
  let body;

  if (type === 'clean') {
    body = `### ✅ Subsrf Design Check — No violations found\n\n${filesScanned} file${filesScanned !== 1 ? 's' : ''} scanned against tokens from \`${source}\`. All design values are token-compliant.`;
  } else if (type === 'patched') {
    body = `### 🔧 Subsrf Auto-Fix — ${patched} file${patched !== 1 ? 's' : ''} patched\n\nHardcoded design values have been replaced with CSS variables from \`${source}\`.${remaining > 0 ? `\n\n**${remaining} violation${remaining !== 1 ? 's' : ''} could not be auto-fixed** — review manually.` : ''}`;
  } else if (type === 'review') {
    const rows = violations.map(v =>
      `| \`${v.file}:${v.line}\` | \`${v.rule}\` | \`${v.found}\` | ${v.suggestion} |`
    ).join('\n');
    body = `### ⚠️ Subsrf Design Review — ${violations.length} violation${violations.length !== 1 ? 's' : ''} found\n\nTokens sourced from \`${source}\`.\n\n| Location | Rule | Found | Suggestion |\n|---|---|---|---|\n${rows}\n\n*These could not be auto-fixed. Please update manually.*`;
  }

  try {
    await githubApi(ghToken, `/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
  } catch (err) {
    console.error('[webhook] Failed to post PR comment:', err.message);
  }
}
