import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';
import { getInstallationToken, listInstallationRepos } from '../../../../lib/github';

// GET /api/github/repos — list repos accessible to the user's GitHub installation
export async function GET(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data: installations } = await supabase
      .from('github_installations')
      .select('installation_id, account_login, account_type')
      .eq('user_id', auth.user.id);

    if (!installations || installations.length === 0) {
      return NextResponse.json({ repos: [], connected: false });
    }

    // Fetch repos from all installations
    const allRepos = [];
    for (const inst of installations) {
      try {
        const token = await getInstallationToken(inst.installation_id);
        const repos = await listInstallationRepos(token);
        allRepos.push(...repos.map(r => ({
          ...r,
          accountLogin: inst.account_login,
          installationId: inst.installation_id,
        })));
      } catch (err) {
        console.error(`[github/repos] Failed for installation ${inst.installation_id}:`, err.message);
      }
    }

    return NextResponse.json({ repos: allRepos, connected: true });
  } catch (err) {
    console.error('[github/repos] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
