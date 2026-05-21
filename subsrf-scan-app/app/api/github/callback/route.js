import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';

// GET /api/github/callback — handles redirect after GitHub App install
// GitHub sends: ?installation_id=123&setup_action=install
export async function GET(request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get('installation_id');
  const state = url.searchParams.get('state'); 

  if (!installationId) {
    return NextResponse.redirect(new URL('/?gh_error=missing_installation', request.url));
  }

  try {
    // Because GitHub drops the state parameter on App installation redirects,
    // we use the cookie we set in the /install route.
    const cookieUserId = request.cookies.get('gh_install_user')?.value;
    const userId = cookieUserId || (state && state !== 'anon' ? state : null);

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
    if (userId) {
      const supabase = getServiceClient();
      await supabase.from('github_installations').upsert(
        {
          user_id: userId,
          installation_id: parseInt(installationId),
          account_login: accountLogin,
          account_type: accountType,
        },
        { onConflict: 'user_id,installation_id' }
      );
    }

    // Return an HTML page that closes the popup
    return new NextResponse(`
      <html>
        <body style="background: #050508; color: #00FF87; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h2>Connected Successfully!</h2>
            <p style="color: #888;">You can close this window and return to the Scan app.</p>
            <script>
              setTimeout(() => window.close(), 1500);
            </script>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    console.error('[github/callback] Error:', err.message);
    return new NextResponse(`<html><body>Error: ${err.message}. Please close this window and try again.</body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

function getPrivateKey() {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY || '';
  if (raw.startsWith('LS0t')) return Buffer.from(raw, 'base64').toString('utf8');
  return raw;
}
