import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';
import { createAppJWT } from '../../../../lib/github';

// POST /api/github/save-installation
// Called client-side from the callback popup page after GitHub App installation.
// Uses the user's Bearer token so userId is always correct.
export async function POST(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { installationId } = body;
  if (!installationId) return NextResponse.json({ error: 'Missing installationId' }, { status: 400 });

  try {
    const appJwt = createAppJWT();
    const ghRes = await fetch(
      `https://api.github.com/app/installations/${installationId}`,
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!ghRes.ok) {
      return NextResponse.json({ error: `GitHub API error: ${ghRes.status}` }, { status: 400 });
    }

    const installation = await ghRes.json();
    const accountLogin = installation.account?.login || 'unknown';
    const accountType = installation.account?.type || 'User';

    const supabase = getServiceClient();
    const { error } = await supabase.from('github_installations').upsert(
      {
        user_id: auth.user.id,
        installation_id: parseInt(installationId),
        account_login: accountLogin,
        account_type: accountType,
      },
      { onConflict: 'user_id,installation_id' }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, accountLogin });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
