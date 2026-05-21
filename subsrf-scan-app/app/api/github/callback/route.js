import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/withAuth';

// GET /api/github/callback — handles redirect after GitHub App install
// GitHub sends: ?installation_id=123&setup_action=install&code=xxx&state=userId
export async function GET(request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get('installation_id');
  const setupAction = url.searchParams.get('setup_action');
  const state = url.searchParams.get('state'); // our user ID

  if (!installationId) {
    return NextResponse.redirect(new URL('/?gh_error=missing_installation', request.url));
  }

  try {
    // Fetch installation details from GitHub to get account info
    const jwt = (await import('jsonwebtoken')).default;
    const now = Math.floor(Date.now() / 1000);
    const appJwt = jwt.sign(
      { iat: now - 60, exp: now + 600, iss: process.env.GITHUB_APP_ID },
      getPrivateKey(),
      { algorithm: 'RS256' }
    );

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

    let accountLogin = 'unknown';
    let accountType = 'User';

    if (ghRes.ok) {
      const installation = await ghRes.json();
      accountLogin = installation.account?.login || 'unknown';
      accountType = installation.account?.type || 'User';
    }

    // Save to Supabase if we have a valid user ID
    if (state && state !== 'anon') {
      const supabase = getServiceClient();
      await supabase.from('github_installations').upsert(
        {
          user_id: state,
          installation_id: parseInt(installationId),
          account_login: accountLogin,
          account_type: accountType,
        },
        { onConflict: 'user_id,installation_id' }
      );
    }

    // Redirect back to the scan app with success indicator
    return NextResponse.redirect(new URL('/?gh_connected=1', request.url));
  } catch (err) {
    console.error('[github/callback] Error:', err.message);
    return NextResponse.redirect(new URL('/?gh_error=callback_failed', request.url));
  }
}

function getPrivateKey() {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY || '';
  if (raw.startsWith('LS0t')) return Buffer.from(raw, 'base64').toString('utf8');
  return raw;
}
