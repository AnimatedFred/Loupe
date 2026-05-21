import { NextResponse } from 'next/server';
import { verifyAuth, getServiceClient } from '../../../../lib/withAuth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

  const db = getServiceClient();
  const { data, error } = await db
    .from('scan_projects')
    .select('slug, source_url, updated_at, tokens')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  const projects = (data || []).map(p => {
    const tokens = p.tokens;
    const mode = tokens?.hasDark ? 'dark' : tokens?.hasLight ? 'light' : null;
    const t = mode ? tokens[mode] : null;
    return {
      slug: p.slug,
      source_url: p.source_url,
      updated_at: p.updated_at,
      counts: {
        colors: t?.colors?.length ?? 0,
        spacing: t?.spacing?.length ?? 0,
        radius: t?.radius?.length ?? 0,
        typography: t?.typography?.sizes?.length ?? 0,
      },
    };
  });

  return NextResponse.json({ projects }, { headers: CORS });
}
