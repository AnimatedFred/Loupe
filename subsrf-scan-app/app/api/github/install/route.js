import { NextResponse } from 'next/server';
import { getInstallUrl } from '../../../../lib/github';
import { verifyAuth } from '../../../../lib/withAuth';

// GET /api/github/install — redirect user to GitHub App installation page
export async function GET(request) {
  const auth = await verifyAuth(request);
  const state = auth?.user?.id || 'anon';

  const url = getInstallUrl(state);
  return NextResponse.redirect(url);
}
