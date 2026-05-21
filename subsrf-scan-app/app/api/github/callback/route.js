import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/withAuth';

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

    // Return an HTML page that completes the install client-side and closes the popup.
    // The client-side script saves via /api/github/save-installation using the token
    // stored in localStorage by the parent window — this is the reliable save path
    // since GitHub does not forward the state param on App installation redirects.
    return new NextResponse(`
      <html>
        <body style="background: #050508; color: #00FF87; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h2>Connecting…</h2>
            <p id="msg" style="color: #888;">Saving connection…</p>
            <script>
              (async function() {
                try {
                  const params = new URLSearchParams(window.location.search);
                  const installationId = params.get('installation_id');
                  const token = localStorage.getItem('gh_install_token');
                  if (token && installationId) {
                    await fetch('/api/github/save-installation', {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ installationId: parseInt(installationId) }),
                    });
                  }
                  document.getElementById('msg').textContent = 'Connected! Closing window…';
                } catch(e) {
                  document.getElementById('msg').textContent = 'Done. You can close this window.';
                }
                // Signal completion to the parent via localStorage (reliable, same-origin)
                localStorage.setItem('gh_install_done', Date.now());
                // Also try postMessage for immediate notification
                if (window.opener) {
                  try { window.opener.postMessage({ type: 'github_connected' }, '*'); } catch(e) {}
                }
                window.close();
              })();
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
