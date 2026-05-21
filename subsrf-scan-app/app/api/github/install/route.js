import { NextResponse } from 'next/server';
import { getInstallUrl } from '../../../../lib/github';
import { verifyAuth } from '../../../../lib/withAuth';

// GET /api/github/install — redirect user to GitHub App installation page
export async function GET(request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || 'anon';

  const redirectUrl = getInstallUrl(userId);
  const response = NextResponse.redirect(redirectUrl);
  
  // Save user ID to cookie so the callback can read it
  response.cookies.set('gh_install_user', userId, { maxAge: 600, path: '/' });
  
  return response;
}
