import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';

// GET /api/github/status — check if user has a connected GitHub installation
export async function GET(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data: installations } = await supabase
      .from('github_installations')
      .select('installation_id, account_login, account_type, created_at')
      .eq('user_id', auth.user.id);

    const connected = installations && installations.length > 0;

    return NextResponse.json({
      connected,
      installations: installations || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
