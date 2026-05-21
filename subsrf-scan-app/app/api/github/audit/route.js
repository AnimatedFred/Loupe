import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';
import { getInstallationToken, getRepoTree, getFileContent } from '../../../../lib/github';
import { shouldAuditFile, runAudit } from '../../../../lib/auditEngine';

export const maxDuration = 60;

// POST /api/github/audit — run codebase audit on a repo
// Body: { owner, repo, installationId, tokens }
export async function POST(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { owner, repo, installationId, tokens, branch } = await request.json();

  if (!owner || !repo || !installationId) {
    return NextResponse.json({ error: 'owner, repo, and installationId are required' }, { status: 400 });
  }

  if (!tokens) {
    return NextResponse.json({ error: 'tokens required — extract design tokens from a URL first' }, { status: 400 });
  }

  // Verify this installation belongs to the user
  const supabase = getServiceClient();
  const { data: inst } = await supabase
    .from('github_installations')
    .select('installation_id')
    .eq('user_id', auth.user.id)
    .eq('installation_id', installationId)
    .single();

  if (!inst) {
    return NextResponse.json({ error: 'Installation not found or not authorized' }, { status: 403 });
  }

  try {
    console.log(`[github/audit] Starting audit: ${owner}/${repo}`);

    // 1. Get installation token
    const token = await getInstallationToken(installationId);

    // 2. Fetch the repo file tree
    const tree = await getRepoTree(token, owner, repo, branch);
    const auditable = tree.filter(f => shouldAuditFile(f.path));

    // Cap at 200 files to avoid timeouts
    const filesToScan = auditable.slice(0, 200);

    console.log(`[github/audit] ${tree.length} total files, ${auditable.length} auditable, scanning ${filesToScan.length}`);

    // 3. Fetch file contents in parallel (batches of 10)
    const files = [];
    for (let i = 0; i < filesToScan.length; i += 10) {
      const batch = filesToScan.slice(i, i + 10);
      const contents = await Promise.all(
        batch.map(async f => {
          try {
            // Skip files > 100KB (likely minified or generated)
            if (f.size && f.size > 100000) return { path: f.path, content: null };
            const content = await getFileContent(token, owner, repo, f.path);
            return { path: f.path, content };
          } catch {
            return { path: f.path, content: null };
          }
        })
      );
      files.push(...contents);
    }

    // 4. Run the audit
    const result = runAudit(files, tokens);
    result.repoName = `${owner}/${repo}`;

    console.log(`[github/audit] Complete: ${result.totalViolations} violations in ${result.filesScanned} files`);

    return NextResponse.json({ success: true, audit: result });
  } catch (err) {
    console.error('[github/audit] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
